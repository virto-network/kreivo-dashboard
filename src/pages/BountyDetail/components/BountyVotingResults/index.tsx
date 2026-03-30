import React from "react"
import VotingBar from "./VotingBar"
import QuorumStatus from "./QuorumStatus"
import DecisionCurves from "./DecisionCurves"
import "./BountyVotingResults.css"

interface BountyVotingResultsProps {
  voting: {
    forVotes: number
    forPercentage: number
    forCount: number
    againstVotes: number
    againstPercentage: number
    againstCount: number
    quorumCurrent: number
    quorumRequired: number
    quorumReached: boolean
    showCurves?: boolean
    curves?: {
      decisionPeriod: number
      support: any
      approval: any
    } | null
    progress?: number
    timeLeft?: string
    currentApproval?: number
    currentSupport?: number
  }
  syncing?: boolean
}

/**
 * BountyVotingResults Component (Atomic Design)
 *
 * Orchestrates the display of voting progress, quorum status, and decision curves.
 * Decomposes complex logic into specialized sub-components.
 */
const BountyVotingResults: React.FC<BountyVotingResultsProps> = ({
  voting,
  syncing,
}) => {
  const showCurves = voting.showCurves !== undefined ? voting.showCurves : true
  const isSyncing = syncing === true

  return (
    <div className="bounty-voting-results">
      <h3 className="bounty-voting-results__title">Current Results</h3>

      {/* Main Voting Bars */}
      <VotingBar
        label="For"
        votes={voting.forVotes}
        percentage={voting.forPercentage}
        count={voting.forCount}
        type="for"
        isSyncing={isSyncing}
      />

      <VotingBar
        label="Against"
        votes={voting.againstVotes}
        percentage={voting.againstPercentage}
        count={voting.againstCount}
        type="against"
        isSyncing={isSyncing}
      />

      {/* Quorum and Threshold Information */}
      <QuorumStatus
        quorumCurrent={voting.quorumCurrent}
        quorumRequired={voting.quorumRequired}
        quorumReached={voting.quorumReached}
        isSyncing={isSyncing}
      />

      {/* Decision Curves Visualization */}
      {showCurves && (
        <DecisionCurves
          curves={voting.curves}
          progress={voting.progress}
          currentApproval={voting.currentApproval}
          currentSupport={voting.currentSupport}
          actualApproval={voting.forPercentage}
          actualSupport={voting.quorumCurrent}
        />
      )}
    </div>
  )
}

export default BountyVotingResults
