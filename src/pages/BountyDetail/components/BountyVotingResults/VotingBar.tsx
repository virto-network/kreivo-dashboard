import React from "react"
import SkeletonLine from "@/components/ui/Skeleton/SkeletonLine"

interface VotingBarProps {
  label: string
  votes: number | string
  percentage: number
  count: number | string
  type: "for" | "against"
  isSyncing?: boolean
}

/**
 * Sub-component to display a single voting result bar (Aye/Nay).
 */
const VotingBar: React.FC<VotingBarProps> = ({
  label,
  votes,
  percentage,
  count,
  type,
  isSyncing,
}) => {
  const labelClass = `bounty-voting-results__label bounty-voting-results__label--${type}`
  const barClass = `bounty-voting-results__bar bounty-voting-results__bar--${type}`

  return (
    <div className="bounty-voting-results__section">
      <div className="bounty-voting-results__header">
        <span className={labelClass}>{label}</span>
        <span className="bounty-voting-results__value">
          {isSyncing ? <SkeletonLine width="40px" height="24px" /> : votes}
        </span>
      </div>

      <div className="bounty-voting-results__bar-container">
        <div className={barClass} style={{ width: `${percentage}%` }} />
      </div>

      <div className="bounty-voting-results__stats">
        <span className="bounty-voting-results__percentage">
          {isSyncing ? <SkeletonLine width="30px" /> : `${percentage}%`}
        </span>
        <span className="bounty-voting-results__count">
          {isSyncing ? <SkeletonLine width="50px" /> : `${count} votes`}
        </span>
      </div>
    </div>
  )
}

export default VotingBar
