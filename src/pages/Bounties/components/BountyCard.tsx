import React from "react"
import { useNavigate } from "react-router-dom"
import { Bounty } from "@/types/governance"

interface BountyCardProps {
  bounty: Bounty
  isActive?: boolean
}

export const BountyCard: React.FC<BountyCardProps> = ({
  bounty,
  isActive = false,
}) => {
  const navigate = useNavigate()

  return (
    <div
      className={`bounty-card ${isActive ? "bounty-card-active" : ""}`}
      onClick={() => navigate(`/bounty/${bounty.id}`)}
    >
      {isActive && <div className="bounty-card-accent"></div>}
      <div className="bounty-card-header">
        <span
          className={`bounty-category bounty-category-${bounty.categoryColor}`}
        >
          {bounty.category}
        </span>
        {bounty.status && (
          <span
            className={`bounty-status${bounty.status === "Rejected" ? " bounty-status--rejected" : ""}`}
          >
            {bounty.status}
          </span>
        )}
      </div>
      <h3 className="bounty-title">{bounty.title}</h3>
      {bounty.description &&
        bounty.description !== "No description available" && (
          <p className="bounty-description">{bounty.description}</p>
        )}
      {bounty.votingStats && bounty.status === "Active" && (
        <div className="bounty-voting">
          <div className="bounty-voting-labels">
            <span className="bounty-voting-for">
              For {bounty.votingStats.for}%
            </span>
            <span className="bounty-voting-against">
              Against {bounty.votingStats.against}%
            </span>
          </div>
          <div className="bounty-voting-bar">
            <div
              className="bounty-voting-for-bar"
              style={{ width: `${bounty.votingStats.for}%` }}
            ></div>
            <div
              className="bounty-voting-against-bar"
              style={{ width: `${bounty.votingStats.against}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}
