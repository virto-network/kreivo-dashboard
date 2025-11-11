import React, { useEffect, useState } from 'react';
import { chainClient$ } from '@/state/chains/chain.state';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import './Explorer.css';

interface BlockData {
  blockNumber: number;
  hash: string;
  timestamp?: number;
  extrinsicsCount: number;
  transactionsCount: number;
}

const Explorer: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let followSubscription: any = null;
    
    const subscription = chainClient$.subscribe({
      next: ({ chainHead }) => {
        if (!chainHead) {
          setIsLoading(false);
          return;
        }

        try {
          setIsLoading(true);
          

          const blockMap = new Map<string, BlockData>();
          

          const fetchBlockData = async (hash: string): Promise<BlockData | null> => {
            try {
              console.log('Fetching block data for hash:', hash);
              

              const header = await firstValueFrom(chainHead.header$(hash)).catch((err) => {
                console.error('Error getting header:', err);
                return null;
              });
              
              if (!header) {
                console.log('No header found for hash:', hash);
                return null;
              }

              console.log('Header received:', header);


              const body = await firstValueFrom(chainHead.body$(hash)).catch((err) => {
                console.error('Error getting body:', err);
                return null;
              });
              
              const extrinsicsCount = body && Array.isArray(body) ? body.length : 0;
              console.log('Body received, extrinsics count:', extrinsicsCount);


              let blockNumber: number | null = null;
              
              if (header && typeof header === 'object') {
                const headerObj = header as any;
                if ('number' in headerObj) {
                  blockNumber = Number(headerObj.number);
                } else if ('blockNumber' in headerObj) {
                  blockNumber = Number(headerObj.blockNumber);
                }
              }
              
              if (blockNumber === null) {
                console.log('Could not extract block number from header:', header);
                return null;
              }

              console.log('Block data created:', { blockNumber, hash, extrinsicsCount });

              return {
                blockNumber,
                hash: hash,
                extrinsicsCount,
                transactionsCount: extrinsicsCount,
              };
            } catch (error) {
              console.error('Error fetching block data:', error);
              return null;
            }
          };


          followSubscription = chainHead.follow$.subscribe({
            next: async (event) => {
              try {
                console.log('Follow event received:', event);
                

                if (event.type === 'newBlock') {
                  const blockHash = (event as any).blockHash || (event as any).hash;
                  
                  if (blockHash && typeof blockHash === 'string') {
                    console.log('Processing newBlock with hash:', blockHash);
                    

                    const blockData = await fetchBlockData(blockHash);
                    
                    if (blockData) {
                      blockMap.set(blockHash, blockData);
                      

                      setBlocks(prevBlocks => {
                        const updated = [...prevBlocks];
                        const existingIndex = updated.findIndex(b => b.hash === blockHash);
                        
                        if (existingIndex >= 0) {
                          updated[existingIndex] = blockData;
                        } else {
                          updated.push(blockData);
                        }
                        

                        updated.sort((a, b) => b.blockNumber - a.blockNumber);
                        const latest5 = updated.slice(0, 5);
                        console.log('Updated blocks:', latest5);
                        return latest5;
                      });
                    }
                  }
                }
                

                if (event.type === 'initialized') {
                  const blockNumber = event.number;
                  console.log('Initialized event, block number:', blockNumber);
                  

                  const finalizedHash = await firstValueFrom(
                    chainHead.finalized$.pipe(take(1))
                  ).catch(() => null);
                  
                  if (finalizedHash && typeof finalizedHash === 'string') {
                    console.log('Fetching initialized block data for hash:', finalizedHash);
                    const blockData = await fetchBlockData(finalizedHash);
                    
                    if (blockData) {
                      blockMap.set(finalizedHash, blockData);
                      setBlocks(prevBlocks => {
                        const updated = [...prevBlocks];
                        const existingIndex = updated.findIndex(b => b.hash === finalizedHash);
                        
                        if (existingIndex >= 0) {
                          updated[existingIndex] = blockData;
                        } else {
                          updated.push(blockData);
                        }
                        
                        updated.sort((a, b) => b.blockNumber - a.blockNumber);
                        const latest5 = updated.slice(0, 5);
                        console.log('Updated blocks from initialized:', latest5);
                        return latest5;
                      });
                    }
                  }
                }
                

                if (event.type === 'finalized') {
                  const finalizedHash = (event as any).hash || (event as any).blockHash;
                  
                  if (finalizedHash && typeof finalizedHash === 'string') {
                    console.log('Finalized event, hash:', finalizedHash);
                    

                    if (!blockMap.has(finalizedHash)) {
                      const blockData = await fetchBlockData(finalizedHash);
                      
                      if (blockData) {
                        blockMap.set(finalizedHash, blockData);
                        setBlocks(prevBlocks => {
                          const updated = [...prevBlocks];
                          const existingIndex = updated.findIndex(b => b.hash === finalizedHash);
                          
                          if (existingIndex >= 0) {
                            updated[existingIndex] = blockData;
                          } else {
                            updated.push(blockData);
                          }
                          
                          updated.sort((a, b) => b.blockNumber - a.blockNumber);
                          const latest5 = updated.slice(0, 5);
                          console.log('Updated blocks from finalized:', latest5);
                          return latest5;
                        });
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Error processing follow event:', error);
              }
            },
            error: (error) => {
              console.error('Error in follow$ subscription:', error);
            },
          });


          firstValueFrom(
            chainHead.finalized$.pipe(take(1))
          ).then(async (finalizedHash) => {
            console.log('Initial finalized hash:', finalizedHash);
            
            if (finalizedHash && typeof finalizedHash === 'string') {
              const blockData = await fetchBlockData(finalizedHash);
              
              if (blockData) {
                blockMap.set(finalizedHash, blockData);
                setBlocks([blockData]);
                console.log('Initial block set:', blockData);
                

                let currentHash: string = finalizedHash;
                for (let i = 0; i < 4; i++) {
                  try {
                    const currentHeader = await firstValueFrom(chainHead.header$(currentHash)).catch(() => null);
                    if (currentHeader && 'parentHash' in currentHeader && currentHeader.parentHash) {
                      const parentHash: string = typeof currentHeader.parentHash === 'string' 
                        ? currentHeader.parentHash 
                        : String(currentHeader.parentHash);
                      
                      const parentBlock = await fetchBlockData(parentHash);
                      
                      if (parentBlock) {
                        blockMap.set(parentHash, parentBlock);
                        setBlocks(prevBlocks => {
                          const updated = [...prevBlocks, parentBlock];
                          updated.sort((a, b) => b.blockNumber - a.blockNumber);
                          return updated.slice(0, 5);
                        });
                        currentHash = parentHash;
                      } else {
                        break;
                      }
                    } else {
                      break;
                    }
                  } catch (error) {
                    console.error('Error fetching parent block:', error);
                    break;
                  }
                }
              }
            }
          }).catch((error) => {
            console.error('Error getting initial blocks:', error);
          }).finally(() => {
            setIsLoading(false);
          });
        } catch (error) {
          console.error('Error setting up Explorer:', error);
          setIsLoading(false);
        }
      },
      error: (error) => {
        console.error('Error in chainClient subscription:', error);
        setIsLoading(false);
      },
    });

    return () => {
      if (followSubscription) {
        followSubscription.unsubscribe();
      }
      subscription.unsubscribe();
    };
  }, []);

  const formatHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  return (
    <div className="explorer-page">
      <div className="explorer-container">
        <h1 className="explorer-title">Block Explorer</h1>
        <p className="explorer-subtitle">Latest blocks from the blockchain</p>

        {isLoading ? (
          <div className="explorer-loading">
            <div className="loading-spinner"></div>
            <p>Loading blocks...</p>
          </div>
        ) : blocks.length === 0 ? (
          <div className="explorer-empty">
            <p>No blocks available. Please check your connection.</p>
          </div>
        ) : (
          <div className="blocks-list">
            {blocks.map((block, index) => (
              <div key={block.hash || index} className="block-card">
                <div className="block-header">
                  <div className="block-number">
                    Block #{block.blockNumber.toLocaleString()}
                  </div>
                  <div className="block-status">Finalized</div>
                </div>
                <div className="block-body">
                  <div className="block-info-row">
                    <span className="block-label">Hash:</span>
                    <span className="block-value block-hash">{formatHash(block.hash)}</span>
                  </div>
                  <div className="block-info-row">
                    <span className="block-label">Extrinsics:</span>
                    <span className="block-value">{block.extrinsicsCount}</span>
                  </div>
                  <div className="block-info-row">
                    <span className="block-label">Transactions:</span>
                    <span className="block-value">{block.transactionsCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explorer;
