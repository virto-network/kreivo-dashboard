import React, { useState } from "react"
import { ReferendumStatus } from "@/types/governance"
import SkeletonLine from "@/components/ui/Skeleton/SkeletonLine"
import DateDisplay from "./DateDisplay"
import "./BountyHeader.css"

interface BountyHeaderProps {
  id: string
  title: string
  category: string
  categoryColor: string
  status: ReferendumStatus | string
  proposer: {
    address: string
    avatar?: string
  }
  startDate: string | { date: string; time: string }
  endDate: string | { date: string; time: string }
  syncing?: boolean
}

/**
 * BountyHeader Component (Atomic Design - Strict Separation)
 *
 * Orchestrates the header layout using dedicated sub-components.
 */
const BountyHeader: React.FC<BountyHeaderProps> = ({
  id,
  title,
  category,
  categoryColor,
  status,
  proposer,
  startDate,
  endDate,
  syncing,
}) => {
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isRejected =
    typeof status === "string" && status.toLowerCase() === "rejected"
  const statusClass = `bounty-header__status ${isRejected ? "bounty-header__status--rejected" : "bounty-header__status--active"}`

  return (
    <header className="bounty-header">
      <div className="bounty-header__top">
        <div className="bounty-header__tags">
          <span
            className={`bounty-header__category bounty-header__category--${categoryColor}`}
          >
            {category}
          </span>
          <span className="bounty-header__id">#{id}</span>
        </div>

        <div className="bounty-header__actions">
          {syncing ? (
            <SkeletonLine width="80px" height="24px" radius="16px" />
          ) : (
            <span className={statusClass}>
              <span className="bounty-header__status-dot" />
              {status}
            </span>
          )}
          <button
            className={`bounty-header__share-button ${copied ? "bounty-header__share-button--copied" : ""}`}
            onClick={handleShare}
            aria-label="Share bounty"
          >
            <span className="material-symbols-outlined">
              {copied ? "done" : "share"}
            </span>
          </button>
        </div>
      </div>

      <h1 className="bounty-header__title">{title}</h1>

      <div className="bounty-header__meta">
        <div className="bounty-header__proposer">
          <div className="bounty-header__proposer-info">
            <span className="bounty-header__proposer-label">Proposed by</span>
            <span
              className="bounty-header__proposer-address"
              title={proposer.address}
            >
              {proposer.address}
            </span>
          </div>
        </div>

        <div className="bounty-header__divider" />

        <DateDisplay label="Start Date" date={startDate} syncing={syncing} />
        <DateDisplay label="End Date" date={endDate} syncing={syncing} />
      </div>
    </header>
  )
}

export default BountyHeader
