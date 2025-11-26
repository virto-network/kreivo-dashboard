import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useKsmBalance } from '@/hooks/useKsmBalance';
import VirtoConnect from '@/components/VirtoConnect';
import FaucetIframe from '@/components/FaucetIframe';
import { useNotification } from '@/hooks/useNotification';
import { useVirto } from '@/contexts/VirtoContext';
import './WalletWidget.css';

interface WalletWidgetProps {
  onTransferClick?: (asset: 'KSM' | 'DUSD') => void;
}

export const WalletWidget: React.FC<WalletWidgetProps> = ({ onTransferClick }) => {
  const { ksmBalance, dusdBalance, totalUsdValue, ksmPrice, isLoading, error } = useKsmBalance();
  const { isAuthenticated: virtoAuthenticated, setUserAddress, setIsAuthenticated } = useVirto();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAsset, setTransferAsset] = useState<'KSM' | 'DUSD' | null>(null);
  const { showSuccessNotification, showErrorNotification } = useNotification();

  useEffect(() => {
    const virtoConnect = document.getElementById('virtoConnect') as any;

    if (!virtoConnect) return;

    const handleLoginSuccess = async (event: any) => {
      const username = event.detail?.username || event.detail?.userId || event.detail;
      if (username) {
        const virtoConnect = document.getElementById('virtoConnect') as any;
        if (virtoConnect?.sdk) {
          try {
            const { address } = await virtoConnect.sdk.transfer.getUserInfo(virtoConnect.sdk.auth.passkeysAuthenticator.userId);
            if (address) {
              localStorage.setItem('virto_account_address', address);
              console.log('Address saved from SDK:', address);
            }
          } catch (error) {
            console.error('Error getting address from SDK:', error);
          }
        }

        localStorage.setItem('isLoggedIn', 'true');
        setIsAuthenticated(true);
        document.dispatchEvent(new CustomEvent('virto-auth-change'));
      }
    };

    const handleRegisterSuccess = async (event: any) => {
      const username = event.detail?.username || event.detail?.userId || event.detail;
      if (username) {
        const virtoConnect = document.getElementById('virtoConnect') as any;
        if (virtoConnect?.sdk) {
          try {
            const { address } = await virtoConnect.sdk.transfer.getUserInfo(virtoConnect.sdk.auth.passkeysAuthenticator.userId);
            if (address) {
              localStorage.setItem('virto_account_address', address);
              console.log('Address saved from SDK:', address);
            }
          } catch (error) {
            console.error('Error getting address from SDK:', error);
          }
        }

        localStorage.setItem('isLoggedIn', 'true');
        setIsAuthenticated(true);
        document.dispatchEvent(new CustomEvent('virto-auth-change'));
      }
    };

    virtoConnect.addEventListener('login-success', handleLoginSuccess);
    virtoConnect.addEventListener('register-success', handleRegisterSuccess);

    return () => {
      virtoConnect.removeEventListener('login-success', handleLoginSuccess);
      virtoConnect.removeEventListener('register-success', handleRegisterSuccess);
    };
  }, []);

  useEffect(() => {
    const virtoConnect = document.getElementById('virtoConnect') as any;

    if (!virtoConnect) return;

    const handleLoginError = (event: CustomEvent) => {
      const error = event.detail?.error;
      console.log('Login error received:', error);

      if (error) {
        const errorString = error.toString ? error.toString() : JSON.stringify(error);

        const isPaymentError = errorString.includes('InvalidTxError') &&
          errorString.includes('"type": "Invalid"') &&
          errorString.includes('"type": "Payment"');

        if (isPaymentError) {
          console.log('Payment error detected, showing faucet again');

          const usernameInput = virtoConnect.shadowRoot?.querySelector('virto-input[name="username"]');
          const username = usernameInput?.value || '';

          if (username) {
            virtoConnect.showFaucetConfirmation(username);
          }
        }
      }
    };

    const handleFaucetIframeReady = async (event: CustomEvent) => {
      console.log('Faucet iframe ready:', event.detail);
      const { username, address, virtoConnectElement } = event.detail;

      const container = virtoConnectElement.getFaucetContainer();
      if (!container) {
        console.error('Faucet container not found');
        return;
      }

      let isMatrixMember = false;
      let checkingMembership = true;

      try {
        const response = await fetch(`https://connect.virto.one/api/matrix/check-member?username=${encodeURIComponent(username)}`);
        if (response.ok) {
          const data = await response.json();
          isMatrixMember = data.isMember || false;
          console.log('Matrix membership check:', isMatrixMember);
        } else {
          console.warn('Matrix membership check failed');
        }
      } catch (error) {
        console.warn('Error checking Matrix membership:', error);
      } finally {
        checkingMembership = false;
      }

      const root = ReactDOM.createRoot(container);

      const handleAccept = async () => {
        try {
          const sdk = virtoConnect.sdk;
          if (!sdk) {
            throw new Error('SDK not available');
          }

          console.log('Calling addMember for user:', username);

          const faucetResult = await sdk.auth.addMember(username);
          console.log('Faucet successful:', faucetResult);

          showSuccessNotification("Welcome Bonus Processed!", "Your $100 welcome bonus has been successfully processed.");

          setTimeout(() => {
            root.unmount();
            virtoConnectElement.completeFaucetFlowFromParent(true, faucetResult);
          }, 1500);

          return { success: true };

        } catch (error) {
          console.error('Faucet failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to process welcome bonus';
          showErrorNotification("Welcome Bonus Failed", errorMessage);
          return { success: false, error: errorMessage };
        }
      };

      const handleDecline = () => {
        console.log('Faucet declined');
        root.unmount();
        virtoConnectElement.completeFaucetFlowFromParent(false);
      };

      root.render(
        <FaucetIframe
          username={username}
          address={address}
          isMatrixMember={isMatrixMember}
          checkingMembership={checkingMembership}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      );

      virtoConnectElement.faucetCleanup = () => {
        root.unmount();
      };
    };

    virtoConnect.addEventListener('login-error', handleLoginError);
    virtoConnect.addEventListener('faucet-iframe-ready', handleFaucetIframeReady);

    return () => {
      virtoConnect.removeEventListener('login-error', handleLoginError);
      virtoConnect.removeEventListener('faucet-iframe-ready', handleFaucetIframeReady);

      if (virtoConnect.faucetCleanup) {
        virtoConnect.faucetCleanup();
      }
    };
  }, [showSuccessNotification, showErrorNotification]);

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.wallet-menu-container')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const ksmAmount = Number(ksmBalance) / 1e12; // KSM has 12 decimals

  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${formatNumber(num)}`;
  };

  if (error) {
    return (
      <div className="wallet-widget">
        <div className="wallet-error">
          <p>Error loading wallet: {error}</p>
        </div>
      </div>
    );
  }

  if (!virtoAuthenticated) {
    return (
      <div className="dashboard-box">
        <div className="dashboard-box-header">
          <h3 className="dashboard-box-title">Wallet</h3>
          <div className="dashboard-box-icon" style={{ opacity: 0.3 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </div>
        </div>
        <div className="dashboard-box-content">
          <div className="wallet-no-account">
            <div className="wallet-no-account-content">
              <p className="wallet-no-account-text">Connect your wallet to view balance</p>
              <div className="wallet-connect-button-wrapper">
                <VirtoConnect
                  serverUrl="https://connect.virto.one/api"
                  providerUrl="wss://kreivo.io"
                  onAuthSuccess={(user: any) => {
                    console.log('onAuthSuccess received user:', user);

                    const address = user?.address || user?.profile?.address || user?.metadata?.address;

                    if (address) {
                      setUserAddress(address);
                      console.log('Address saved:', address);
                    } else {
                      console.warn('No address found in onAuthSuccess user object:', user);
                    }

                    setIsAuthenticated(true);

                  }}
                  onAuthError={(error) => {
                    console.error('Auth error:', error);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleTransferClick = (asset: 'KSM' | 'DUSD') => {
    setShowMenu(false);
    if (onTransferClick) {
      onTransferClick(asset);
    } else {

      setTransferAsset(asset);
      setShowTransferModal(true);
    }
  };

  return (
    <div className="dashboard-box">
      <div className="dashboard-box-header">
        <h3 className="dashboard-box-title">Wallet</h3>
        <div className="wallet-menu-container">
          <button
            className="dashboard-box-icon"
            onClick={() => setShowMenu(!showMenu)}
            title="Wallet actions"
            style={{ cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="wallet-dropdown-menu">
              <button
                className="wallet-menu-item"
                onClick={() => handleTransferClick('KSM')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
                <span>Transfer KSM</span>
              </button>
              <button
                className="wallet-menu-item"
                onClick={() => handleTransferClick('DUSD')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
                <span>Transfer DUSD</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-box-content">
        <div className="wallet-main">
          <div className="wallet-large-number">
            {isLoading ? (
              <span className="wallet-loading">Loading...</span>
            ) : (
              <span>{formatLargeNumber(totalUsdValue)}</span>
            )}
          </div>
          <div
            className="wallet-small-number"
            onClick={() => setShowBreakdown(!showBreakdown)}
            style={{ cursor: 'pointer' }}
          >
            {isLoading ? (
              <span className="wallet-loading-small">...</span>
            ) : (
              <>
                {showBreakdown ? (
                  <div className="wallet-breakdown">
                    <div className="wallet-breakdown-item">
                      <span className="wallet-breakdown-label">KSM:</span>
                      <span className="wallet-breakdown-value">{formatNumber(ksmAmount, 4)}</span>
                    </div>
                    <div className="wallet-breakdown-item">
                      <span className="wallet-breakdown-label">DUSD:</span>
                      <span className="wallet-breakdown-value">{formatNumber(dusdBalance, 2)}</span>
                    </div>
                    <div className="wallet-breakdown-item">
                      <span className="wallet-breakdown-label">Price:</span>
                      <span className="wallet-breakdown-value">${formatNumber(ksmPrice, 2)}</span>
                    </div>
                  </div>
                ) : (
                  <span className="wallet-compact">
                    {formatNumber(ksmAmount, 4)} KSM • ${formatNumber(dusdBalance, 2)} DUSD
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && transferAsset && (
        <div className="wallet-modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wallet-modal-header">
              <h3>Transfer {transferAsset}</h3>
              <button
                className="wallet-modal-close"
                onClick={() => setShowTransferModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="wallet-modal-body">
              <div className="wallet-transfer-form">
                <div className="wallet-form-group">
                  <label>Recipient Address</label>
                  <input
                    type="text"
                    placeholder="Enter address..."
                    className="wallet-input"
                  />
                </div>
                <div className="wallet-form-group">
                  <label>Amount</label>
                  <div className="wallet-amount-input">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="wallet-input"
                      step="0.0001"
                    />
                    <span className="wallet-asset-label">{transferAsset}</span>
                  </div>
                  <div className="wallet-balance-info">
                    Available: {transferAsset === 'KSM' ? formatNumber(ksmAmount, 4) : formatNumber(dusdBalance, 2)} {transferAsset}
                  </div>
                </div>
                <div className="wallet-form-actions">
                  <button
                    className="wallet-button wallet-button-secondary"
                    onClick={() => setShowTransferModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="wallet-button wallet-button-primary"
                    onClick={() => {
                      showSuccessNotification('Transfer Initiated', `Your ${transferAsset} transfer is being processed`);
                      setShowTransferModal(false);
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

