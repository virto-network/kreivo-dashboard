import React from "react"
import SkeletonLine from "@/components/ui/Skeleton/SkeletonLine"

interface QuorumStatusProps {
  quorumCurrent: number
  quorumRequired: number
  quorumReached: boolean
  isSyncing?: boolean
}

/**
 * Sub-component to display the quorum threshold and current reach.
 */
const QuorumStatus: React.FC<QuorumStatusProps> = ({
  quorumCurrent,
  quorumRequired,
  quorumReached,
  isSyncing,
}) => {
  const statusClass = `bounty-voting-results__quorum-status ${quorumReached && !isSyncing ? "bounty-voting-results__quorum-status--reached" : ""}`

  return (
    <div className="bounty-voting-results__quorum">
      <div className="bounty-voting-results__quorum-header">
        <span className="bounty-voting-results__quorum-label">Quorum</span>
        <span className={statusClass}>
          {isSyncing ? (
            <SkeletonLine width="70px" />
          ) : (
            <>
              <span className="material-symbols-outlined bounty-voting-results__quorum-icon">
                {quorumReached ? "check_circle" : "radio_button_unchecked"}
              </span>
              {quorumReached ? "Reached" : "Not Reached"}
            </>
          )}
        </span>
      </div>

      <div className="bounty-voting-results__quorum-bar-container">
        {!isSyncing && (
          <div
            className="bounty-voting-results__quorum-threshold"
            style={{ left: `${quorumRequired}%` }}
            title={`Quorum Threshold: ${quorumRequired}%`}
          />
        )}
        <div
          className="bounty-voting-results__quorum-bar"
          style={{ width: `${quorumCurrent}%` }}
        />
      </div>

      <div className="bounty-voting-results__quorum-stats">
        <span className="bounty-voting-results__quorum-stat">
          Current:{" "}
          {isSyncing ? (
            <SkeletonLine width="30px" height="12px" />
          ) : (
            `${quorumCurrent}%`
          )}
        </span>
        <span className="bounty-voting-results__quorum-stat">
          Required:{" "}
          {isSyncing ? (
            <SkeletonLine width="30px" height="12px" />
          ) : (
            `${quorumRequired}%`
          )}
        </span>
      </div>
    </div>
  )
}

export default QuorumStatus
