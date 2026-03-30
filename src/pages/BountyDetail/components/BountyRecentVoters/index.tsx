import React from "react"
import SkeletonLine from "@/components/ui/Skeleton/SkeletonLine"
import VoterItem from "./VoterItem"
import "./BountyRecentVoters.css"

interface Voter {
  address: string
  vote: string
  amount?: number
}

interface BountyRecentVotersProps {
  voters: Voter[]
  syncing?: boolean
}

/**
 * BountyRecentVoters Component (Atomic Design)
 *
 * Displays a list of the most recent voters for a bounty.
 * Optimized for performance and readability.
 */
const BountyRecentVoters: React.FC<BountyRecentVotersProps> = ({
  voters,
  syncing,
}) => {
  return (
    <div className="bounty-recent-voters">
      <div className="bounty-recent-voters__header">
        <h3 className="bounty-recent-voters__title">Recent Voters</h3>
        <button
          className="bounty-recent-voters__view-all"
          aria-label="View all voters"
        >
          View All
        </button>
      </div>

      <div className="bounty-recent-voters__list">
        {syncing ? (
          // Loading states using common UI primitives
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="bounty-recent-voters__item skeleton-item"
            >
              <SkeletonLine width="50%" height="20px" />
              <SkeletonLine width="20%" height="20px" radius="9999px" />
            </div>
          ))
        ) : voters.length === 0 ? (
          <div className="bounty-recent-voters__empty">No votes yet</div>
        ) : (
          voters.map((voter, index) => (
            <VoterItem key={`${voter.address}-${index}`} voter={voter} />
          ))
        )}
      </div>
    </div>
  )
}

export default BountyRecentVoters
