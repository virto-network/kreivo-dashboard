import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { recentEvents$ } from './events.state';
import { useStateObservable, withDefault } from '@react-rxjs/core';
import { CommandSearch } from '@/components/CommandSearch';
import { Command } from '@/data/commands.en';
import { useCommunities } from '@/hooks/useCommunities';
import { useInitiatives } from '@/hooks/useInitiatives';
import { chainClient$ } from '@/state/chains/chain.state';
import { firstValueFrom, map, switchMap } from 'rxjs';
import { WalletWidget } from '@/components/WalletWidget';
import './Index.css';

import {
  client$,
} from "@/state/chains/chain.state"

const finalizedNum$ = client$.pipeState(
  switchMap((client) => client.finalizedBlock$),
  map((v: any) => v.number),
  withDefault(0),
)
const finalized$ = finalizedNum$.pipeState(
  map((v) => v.toLocaleString()),
  withDefault('0'),
)
const best$ = client$.pipeState(
  switchMap((client) => client.bestBlocks$),
  map(([v]) => v.number.toLocaleString()),
  withDefault('0'),
)

const Index: React.FC = () => {
  const navigate = useNavigate();
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [blockTimeElapsed, setBlockTimeElapsed] = useState<number>(0);
  const [blocksCount, setBlocksCount] = useState<number>(() => {
    const saved = sessionStorage.getItem('explorer-blocks-count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [latestBlockKey, setLatestBlockKey] = useState<number>(0);
  const [commandTrigger, setCommandTrigger] = useState<{ commandId: string; initialData?: any } | null>(null);
  const [showCommunityMenu, setShowCommunityMenu] = useState(false);
  const [showExplorerMenu, setShowExplorerMenu] = useState(false);
  const communityMenuRef = React.useRef<HTMLDivElement>(null);
  const explorerMenuRef = React.useRef<HTMLDivElement>(null);
  const events = useStateObservable(recentEvents$);
  const finalized = useStateObservable(finalized$);
  const finalizedNum = useStateObservable(finalizedNum$);
  const best = useStateObservable(best$);
  const { communities, isLoading: communitiesLoading } = useCommunities(3);
  const { initiatives, isLoading: initiativesLoading } = useInitiatives(1, 3);

  const blocksWithEvents = React.useMemo(() => {
    const blockNumbers = new Set<number>();
    if (Array.isArray(events)) {
      events.forEach((event: any) => {
        if (event && typeof event.number === 'number') {
          blockNumbers.add(event.number);
        }
      });
    }
    return blockNumbers;
  }, [events]);

  useEffect(() => {
    const subscription = chainClient$.subscribe({
      next: ({ chainHead }) => {
        if (!chainHead) return;

        const fetchBlockNumber = async (hash: string): Promise<number | null> => {
          try {
            const header = await firstValueFrom(chainHead.header$(hash)).catch(() => null);
            if (!header) return null;
            const headerObj = header as any;
            return 'number' in headerObj ? Number(headerObj.number) :
              'blockNumber' in headerObj ? Number(headerObj.blockNumber) : null;
          } catch (error) {
            console.error('Error fetching block number:', error);
            return null;
          }
        };

        const followSub = chainHead.follow$.subscribe({
          next: async (event) => {
            if (event.type === 'newBlock') {
              const blockHash = (event as any).blockHash || (event as any).hash;
              if (blockHash && typeof blockHash === 'string') {
                const blockNumber = await fetchBlockNumber(blockHash);
                if (blockNumber !== null) {
                  setLatestBlock(blockNumber);
                  setBlockTimeElapsed(0);
                  setBlocksCount(prev => {
                    const newCount = Math.min(prev + 1, 30);
                    sessionStorage.setItem('explorer-blocks-count', newCount.toString());
                    setLatestBlockKey(blockNumber);
                    return newCount;
                  });
                }
              }
            }

            if (event.type === 'initialized') {
              const finalizedHash = await firstValueFrom(chainHead.finalized$).catch(() => null);
              if (finalizedHash && typeof finalizedHash === 'string') {
                const blockNumber = await fetchBlockNumber(finalizedHash);
                if (blockNumber !== null) {
                  setLatestBlock(blockNumber);
                }
              }
            }
          }
        });

        return () => {
          followSub.unsubscribe();
        };
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setBlockTimeElapsed(0);
    const timerInterval = setInterval(() => {
      setBlockTimeElapsed(prev => prev + 0.1);
    }, 100);
    return () => clearInterval(timerInterval);
  }, [latestBlock]);

  useEffect(() => {
    if (latestBlockKey > 0) {
      const timer = setTimeout(() => {
        const elements = document.querySelectorAll('.explorer-block-square.latest-block');
        elements.forEach((el) => {
          el.classList.remove('latest-block');
          void (el as HTMLElement).offsetWidth;
          el.classList.add('latest-block');
        });
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [latestBlockKey]);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (communityMenuRef.current && !communityMenuRef.current.contains(event.target as Node)) {
        setShowCommunityMenu(false);
      }
      if (explorerMenuRef.current && !explorerMenuRef.current.contains(event.target as Node)) {
        setShowExplorerMenu(false);
      }
    };

    if (showCommunityMenu || showExplorerMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCommunityMenu, showExplorerMenu]);

  const handleCommunityActionClick = (action: 'create' | 'add-member' | 'remove-member' | 'buy-membership', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowCommunityMenu(false);
    const commandMap = {
      'create': 'create-community',
      'add-member': 'add-member-community',
      'remove-member': 'remove-member-community',
      'buy-membership': 'buy-membership',
    };
    setCommandTrigger({
      commandId: commandMap[action],
      initialData: {},
    });
  };

  const handleExplorerActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowExplorerMenu(false);
    setCommandTrigger({
      commandId: 'block-explorer',
      initialData: {},
    });
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-grid">
        {/* Explorer */}
        <div className="dashboard-box">
          <div className="dashboard-box-header">
            <h3 className="dashboard-box-title">Explorer</h3>
            <div className="communities-menu-container" ref={explorerMenuRef}>
              <button
                className="communities-menu-button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowExplorerMenu(!showExplorerMenu);
                }}
                title="Explorer actions"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>
              {showExplorerMenu && (
                <div className="communities-dropdown-menu">
                  <button
                    className="communities-menu-item"
                    onClick={handleExplorerActionClick}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    View Block
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="dashboard-box-content">
            <div className="explorer-main">
              <div className="explorer-left">
                <div className="explorer-block-number">
                  {best ? `# ${best}` : 'Loading...'}
                </div>
                <div className="explorer-finalized">
                  Finalized: {finalized ? `# ${finalized}` : 'Loading...'}
                </div>
                <div className="explorer-blocks-grid">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const row = 4 - Math.floor(i / 6);
                    const col = i % 6;
                    const gridIndex = row * 6 + col;

                    const hasBlock = gridIndex < blocksCount;
                    const blockNumber = best ? (Number(best.replace(/,/g, '')) - (blocksCount - 1 - gridIndex)) : null;
                    const isFinalized = blockNumber !== null && finalizedNum !== null && blockNumber <= finalizedNum;
                    const isIncluded = hasBlock && !isFinalized;
                    const hasEvents = blockNumber !== null && blocksWithEvents.has(blockNumber);
                    const isLatest = blockNumber === latestBlockKey && hasBlock;

                    return (
                      <Link
                        key={i}
                        to={hasBlock && blockNumber !== null ? `/explorer/${blockNumber}` : '#'}
                        className={`explorer-block-square ${hasBlock ? 'visible' : 'hidden'} ${isIncluded ? 'included' : ''} ${isFinalized ? 'finalized' : ''} ${hasEvents ? 'with-events' : ''} ${isLatest ? 'latest-block' : ''}`}
                        title={hasBlock && blockNumber !== null ? `Block #${blockNumber}` : undefined}
                        style={{ textDecoration: 'none', display: 'block' }}
                        onClick={(e) => {
                          if (!hasBlock || blockNumber === null) {
                            e.preventDefault();
                          }
                        }}
                      >
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className="explorer-right">
                <div className="explorer-timer">
                  <svg key={latestBlock || 'initial'} className="explorer-timer-svg" viewBox="0 -3 50 50">
                    <path d="M2.5 25.98Q0 21.65 2.5 17.32L10 4.33Q12.5 0 17.5 0L32.5 0Q37.5 0 40 4.33L47.5 17.32Q50 21.65 47.5 25.98L40 38.971Q37.5 43.3 32.5 43.3L17.5 43.3Q12.5 43.3 10 38.971Z"></path>
                  </svg>
                  <div className="explorer-timer-text">
                    {blockTimeElapsed.toFixed(1)}s
                  </div>
                </div>
                <div className="explorer-events">
                  {events.length > 0 ? (
                    events.slice(0, 4).map((evt: any, index: number) => {
                      const eventText = evt.event?.type && evt.event?.value?.type
                        ? `${evt.event.type}.${evt.event.value.type}`
                        : 'Unknown';
                      return (
                        <div key={index} className="explorer-event">
                          {eventText}
                        </div>
                      );
                    })
                  ) : (
                    <div className="explorer-event">No events</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Communities */}
        <div className="dashboard-box">
          <div className="dashboard-box-header">
            <h3 className="dashboard-box-title">Communities</h3>
            <div className="communities-menu-container" ref={communityMenuRef}>
              <button
                className="communities-menu-button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCommunityMenu(!showCommunityMenu);
                }}
                title="Community actions"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="12" cy="5" r="1"></circle>
                  <circle cx="12" cy="19" r="1"></circle>
                </svg>
              </button>
              {showCommunityMenu && (
                <div className="communities-dropdown-menu">
                  <button
                    className="communities-menu-item"
                    onClick={(e) => handleCommunityActionClick('create', e)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create Community
                  </button>
                  <button
                    className="communities-menu-item"
                    onClick={(e) => handleCommunityActionClick('add-member', e)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    Add Member
                  </button>
                  <button
                    className="communities-menu-item"
                    onClick={(e) => handleCommunityActionClick('remove-member', e)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    Remove Member
                  </button>
                  <button
                    className="communities-menu-item"
                    onClick={(e) => handleCommunityActionClick('buy-membership', e)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    Buy Membership
                  </button>
                </div>
              )}
            </div>
          </div>
          <Link to="/communities" className="dashboard-box-content-link">
            <div className="dashboard-box-content">
              <div className="community-list">
                {communitiesLoading ? (
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Loading communities...</div>
                ) : communities.length === 0 ? (
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>No communities found</div>
                ) : (
                  communities.map((community, index) => {
                    const gradients = [
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    ];
                    const indicators = ['#10b981', '#3b82f6', '#fbbf24'];
                    const gradient = gradients[index % gradients.length];
                    const indicator = indicators[index % indicators.length];

                    const membersText = community.members
                      ? community.members >= 1000
                        ? `${(community.members / 1000).toFixed(1)}k members`
                        : `${community.members} members`
                      : '0 members';

                    return (
                      <div key={community.id} className="community-item">
                        <div className="community-logo" style={{ background: gradient }}></div>
                        <div className="community-info">
                          <div className="community-name">{community.name}</div>
                          <div className="community-members">{membersText}</div>
                        </div>
                        <div className="community-indicator" style={{ backgroundColor: indicator }}></div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Wallet */}
        <WalletWidget
          onTransferClick={(asset: 'KSM' | 'DUSD') => {
            setCommandTrigger({
              commandId: 'send-transaction',
              initialData: { asset }
            });
          }}
        />



        {/* Marketplace */}
        <Link to="/marketplace" className="dashboard-box-link">
          <div className="dashboard-box">
            <div className="dashboard-box-header">
              <h3 className="dashboard-box-title">Marketplace</h3>
              <div className="dashboard-box-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </div>
            </div>
            <div className="dashboard-box-content">
              <div className="coming-soon-banner">Coming Soon</div>
              <div className="marketplace-grid">
                <div className="marketplace-item">
                  <div className="marketplace-item-image" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
                  <div className="marketplace-item-info">
                    <div className="marketplace-item-title">Cosmic Queen</div>
                    <div className="marketplace-item-price">2.5 ETH</div>
                  </div>
                </div>
                <div className="marketplace-item">
                  <div className="marketplace-item-image" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}></div>
                  <div className="marketplace-item-info">
                    <div className="marketplace-item-title">Pixel Worlds</div>
                    <div className="marketplace-item-price">1.2 ETH</div>
                  </div>
                </div>
                <div className="marketplace-item">
                  <div className="marketplace-item-image" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}></div>
                  <div className="marketplace-item-info">
                    <div className="marketplace-item-title">Molten Horde</div>
                    <div className="marketplace-item-price">0.9 ETH</div>
                  </div>
                </div>
                <div className="marketplace-item">
                  <div className="marketplace-item-image" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}></div>
                  <div className="marketplace-item-info">
                    <div className="marketplace-item-title">Cyber Sky</div>
                    <div className="marketplace-item-price">1.1 ETH</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Acme DAO Initiatives */}
        <Link to="/initiatives" className="dashboard-box-link">
          <div className="dashboard-box">
            <div className="dashboard-box-header">
              <h3 className="dashboard-box-title">Acme DAO Initiatives</h3>
              <div className="dashboard-box-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
            </div>
            <div className="dashboard-box-content">
              <div className="coming-soon-banner">Coming Soon</div>
              <div className="initiative-list">
                {initiativesLoading ? (
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>Loading initiatives...</div>
                ) : initiatives.length === 0 ? (
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>No initiatives found</div>
                ) : (
                  initiatives.map((initiative) => {
                    let progressColor = '#10b981';
                    if (initiative.progress < 50) {
                      progressColor = '#ef4444';
                    } else if (initiative.progress < 80) {
                      progressColor = '#fbbf24';
                    }

                    return (
                      <div key={initiative.id} className="initiative-item">
                        <div className="initiative-name">{initiative.name}</div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${initiative.progress}%`,
                              backgroundColor: progressColor
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Recent Payments */}
        <Link to="/payments" className="dashboard-box-link">
          <div className="dashboard-box">
            <div className="dashboard-box-header">
              <h3 className="dashboard-box-title">Recent Payments</h3>
              <div className="dashboard-box-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </div>
            </div>
            <div className="dashboard-box-content">
              <div className="coming-soon-banner">Coming Soon</div>
              <div className="payment-list">
                <div className="payment-item">
                  <div className="payment-info">
                    <div className="payment-name">NFT Purchase</div>
                    <div className="payment-time">2 hours ago</div>
                  </div>
                  <div className="payment-amount" style={{ color: '#E53E3E' }}>-2.5 ETH</div>
                </div>
                <div className="payment-item">
                  <div className="payment-info">
                    <div className="payment-name">Staking Reward</div>
                    <div className="payment-time">1 day ago</div>
                  </div>
                  <div className="payment-amount" style={{ color: '#48BB78' }}>+0.15 ETH</div>
                </div>
                <div className="payment-item">
                  <div className="payment-info">
                    <div className="payment-name">DeFi Swap</div>
                    <div className="payment-time">3 days ago</div>
                  </div>
                  <div className="payment-amount" style={{ color: '#E53E3E' }}>-500 USDC</div>
                </div>
              </div>
            </div>
          </div>
        </Link>


      </div>

      {/* Prompt Input Section */}
      <CommandSearch
        onCommandSelect={(command: Command) => {
          console.log('Command selected:', command);
        }}
        onWidgetComplete={(command: Command, data: any) => {
          if (command.id === 'block-explorer' && data?.blockHash) {
            const blockNumber = data.blockHash.match(/^\d+$/) ? data.blockHash : null;
            if (blockNumber) {
              navigate(`/explorer/${blockNumber}`);
            } else {
              navigate(`/explorer/${data.blockHash}`);
            }
          }
          if (command.id === 'send-transaction') {
            console.log('Transaction completed:', data);
            if (data.success) {
              console.log(`✅ Transaction sent successfully!`);
              console.log(`   Asset: ${data.asset}`);
              console.log(`   Amount: ${data.amount}`);
              console.log(`   To: ${data.address}`);
              console.log(`   TxHash: ${data.txHash}`);


            }
          }
        }}
        externalTrigger={commandTrigger}
        onExternalTriggerHandled={() => setCommandTrigger(null)}
      />
    </div>
  );
};

export default Index;
