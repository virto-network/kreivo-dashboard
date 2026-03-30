import React from "react"
import { Bounty } from "@/types/governance"
import { BountyCard } from "./BountyCard"
import { BountySkeletonCard } from "./BountySkeletonCard"

type ColumnVariant = "preparing" | "active" | "passed" | "executed" | "rejected"

interface BountyColumnProps {
  title: string
  variant: ColumnVariant
  bounties: Bounty[]
  isActive?: boolean
  showSkeleton?: boolean
  skeletonCount?: number
}

export const BountyColumn: React.FC<BountyColumnProps> = ({
  title,
  variant,
  bounties,
  isActive = false,
  showSkeleton = false,
  skeletonCount = 1,
}) => {
  return (
    <div className="bounties-column">
      <div className="bounties-column-header">
        <h2
          className={`bounties-column-title bounties-column-title-${variant}`}
        >
          {title}
          {variant === "active" && (
            <span className="bounties-pulse">
              <span className="bounties-pulse-ring"></span>
              <span className="bounties-pulse-dot"></span>
            </span>
          )}
        </h2>
        <button className="bounties-column-menu">
          <span className="material-icons-round">more_vert</span>
        </button>
      </div>
      <div className="bounties-column-content">
        {bounties.map((bounty) => (
          <BountyCard key={bounty.id} bounty={bounty} isActive={isActive} />
        ))}
        {showSkeleton &&
          Array.from({ length: skeletonCount }).map((_, i) => (
            <BountySkeletonCard key={`skel-${i}`} />
          ))}
      </div>
    </div>
  )
}
