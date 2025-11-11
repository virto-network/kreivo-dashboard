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

  const circumference = 2 * Math.PI * 16;
  const blockProgress = (blockTimeElapsed / 0.5) * circumference;

  return (
    <div className="dashboard-page">
      <div className="dashboard-grid">
        {/* Explorer */}
        <div className="dashboard-box">
            <div className="dashboard-box-header">
              <h3 className="dashboard-box-title">Explorer</h3>
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
                    <svg className="explorer-timer-circle" viewBox="0 0 36 36">
                      <circle
                        className="explorer-timer-bg"
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="rgba(222, 208, 241, 0.2)"
                        strokeWidth="2"
                      />
                      <circle
                        className="explorer-timer-progress"
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="#6B46C1"
                        strokeWidth="2"
                        strokeDasharray={`${blockProgress}, ${circumference}`}
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"
                      />
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
        <Link to="/communities" className="dashboard-box-link">
          <div className="dashboard-box">
            <div className="dashboard-box-header">
              <h3 className="dashboard-box-title">Communities</h3>
              <div className="dashboard-box-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3"></path>
              </svg>
              </div>
            </div>
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

        {/* Latest Discussions */}
        <Link to="/discussions" className="dashboard-box-link">
          <div className="dashboard-box">
            <div className="dashboard-box-header">
              <h3 className="dashboard-box-title">Latest Discussions</h3>
              <div className="dashboard-box-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              </div>
            </div>
            <div className="dashboard-box-content">
              <div className="coming-soon-banner">Coming Soon</div>
              <div className="discussion-list">
                <div className="discussion-item">
                  <div className="discussion-title">Layer 2 Scaling Solutions</div>
                  <div className="discussion-meta">
                    <span className="discussion-author">by @dev_builder</span>
                    <span className="discussion-separator">•</span>
                    <span className="discussion-time">2h ago</span>
                  </div>
                  <div className="discussion-stats">
                    <div className="discussion-stat">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span>12</span>
                    </div>
                    <div className="discussion-stat">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      <span>5</span>
                    </div>
                  </div>
                </div>
                <div className="discussion-item">
                  <div className="discussion-title">New DeFi Protocol Launch</div>
                  <div className="discussion-meta">
                    <span className="discussion-author">by @sol_builder</span>
                    <span className="discussion-separator">•</span>
                    <span className="discussion-time">1 day ago</span>
                  </div>
                  <div className="discussion-stats">
                    <div className="discussion-stat">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span>8</span>
                    </div>
                    <div className="discussion-stat">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      <span>10</span>
                    </div>
                  </div>
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
        }}
      />
    </div>
  );
};

export default Index;
