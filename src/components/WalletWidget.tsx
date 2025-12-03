import React, { useState, useEffect } from "react"
import { useKsmBalance } from "@/hooks/useKsmBalance"
import { useNotification } from "@/hooks/useNotification"
import { useVirto } from "@/contexts/VirtoContext"
import "./WalletWidget.css"

interface WalletWidgetProps {
  onTransferClick?: (asset: "KSM" | "DUSD") => void
}

export const WalletWidget: React.FC<WalletWidgetProps> = ({
  onTransferClick,
}) => {
  const { ksmBalance, dusdBalance, totalUsdValue, ksmPrice, isLoading, error } =
    useKsmBalance()
  const { isAuthenticated: virtoAuthenticated } = useVirto()
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferAsset, setTransferAsset] = useState<"KSM" | "DUSD" | null>(
    null,
  )
  const { showSuccessNotification } = useNotification()

  useEffect(() => {
    if (!showMenu) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(".wallet-menu-container")) {
        setShowMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showMenu])

  const ksmAmount = Number(ksmBalance) / 1e12 // KSM has 12 decimals

  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`
    }
    return `$${formatNumber(num)}`
  }

  if (error) {
    return (
      <div className="wallet-widget">
        <div className="wallet-error">
          <p>Error loading wallet: {error}</p>
        </div>
      </div>
    )
  }

  if (!virtoAuthenticated) {
    return (
      <div className="dashboard-box">
        <div className="dashboard-box-header">
          <h3 className="dashboard-box-title">Wallet</h3>
          <div className="dashboard-box-icon" style={{ opacity: 0.3 }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </div>
        </div>
        <div className="dashboard-box-content">
          <div className="wallet-no-account">
            <div className="wallet-no-account-content">
              <p className="wallet-no-account-text">Connect to view balance</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleTransferClick = (asset: "KSM" | "DUSD") => {
    setShowMenu(false)
    if (onTransferClick) {
      onTransferClick(asset)
    } else {
      setTransferAsset(asset)
      setShowTransferModal(true)
    }
  }

  return (
    <div className="dashboard-box">
      <div className="dashboard-box-header">
        <h3 className="dashboard-box-title">Wallet</h3>
        <div className="wallet-menu-container">
          <button
            className="dashboard-box-icon"
            onClick={() => setShowMenu(!showMenu)}
            title="Wallet actions"
            style={{
              cursor: "pointer",
              background: "transparent",
              border: "none",
              padding: 0,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
                onClick={() => handleTransferClick("KSM")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
                <span>Transfer KSM</span>
              </button>
              <button
                className="wallet-menu-item"
                onClick={() => handleTransferClick("DUSD")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
            style={{ cursor: "pointer" }}
          >
            {isLoading ? (
              <span className="wallet-loading-small">...</span>
            ) : (
              <>
                {showBreakdown ? (
                  <div className="wallet-breakdown">
                    <div className="wallet-breakdown-item">
                      <span className="wallet-breakdown-label">KSM:</span>
                      <span className="wallet-breakdown-value">
                        {formatNumber(ksmAmount, 4)}
                      </span>
                    </div>
                    <div className="wallet-breakdown-item">
                      <span className="wallet-breakdown-label">DUSD:</span>
                      <span className="wallet-breakdown-value">
                        {formatNumber(dusdBalance, 2)}
                      </span>
                    </div>
                    <div className="wallet-breakdown-item">
                      <span className="wallet-breakdown-label">Price:</span>
                      <span className="wallet-breakdown-value">
                        ${formatNumber(ksmPrice, 2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="wallet-compact">
                    {formatNumber(ksmAmount, 4)} KSM • $
                    {formatNumber(dusdBalance, 2)} DUSD
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && transferAsset && (
        <div
          className="wallet-modal-overlay"
          onClick={() => setShowTransferModal(false)}
        >
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wallet-modal-header">
              <h3>Transfer {transferAsset}</h3>
              <button
                className="wallet-modal-close"
                onClick={() => setShowTransferModal(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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
                    Available:{" "}
                    {transferAsset === "KSM"
                      ? formatNumber(ksmAmount, 4)
                      : formatNumber(dusdBalance, 2)}{" "}
                    {transferAsset}
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
                      showSuccessNotification(
                        "Transfer Initiated",
                        `Your ${transferAsset} transfer is being processed`,
                      )
                      setShowTransferModal(false)
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
  )
}
