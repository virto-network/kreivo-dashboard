import React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useBountyDetail } from "@/hooks/useBountyDetail"
import { BountyDetailData } from "@/types/governance"
import BountyBreadcrumb from "./components/BountyBreadcrumb"
import BountyHeader from "./components/BountyHeader/index"
import BountyDescription from "./components/BountyDescription"
import BountyVotingResults from "./components/BountyVotingResults/index"
import BountyVotingPanel from "./components/BountyVotingPanel"
import BountyInformation from "./components/BountyInformation"
import BountyRecentVoters from "./components/BountyRecentVoters/index"
import BountyComments from "./components/BountyComments/index"
import "./BountyDetail.css"

/**
 * BountyDetail Page (Presentational Layer)
 *
 * Orchestrates the layout of the bounty detail page.
 * All business logic and data fetching are handled by the specialized `useBountyDetail` hook.
 */
const BountyDetail: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  // Custom hook encapsulates all blockchain/nostr logic and transactions
  const {
    bountyData,
    syncing,
    isVoting,
    isDepositing,
    handleVote,
    handlePlaceDecisionDeposit,
  } = useBountyDetail(id)

  // Fallback skeleton for the loading state (declarative UI)
  const defaultData: BountyDetailData = {
    id: id || "...",
    title: "Proposal ...",
    category: "...",
    categoryColor: "orange",
    communityId: null,
    status: "Loading blockchain...",
    track: "all",
    decisionDepositNeeded: false,
    proposer: { address: "..." },
    startDate: "Loading",
    endDate: "Loading",
    description: "...",
    voting: {
      timeLeft: "Syncing...",
      supportThreshold: 50,
      approvalThreshold: 60,
      forVotes: 0,
      forPercentage: 0,
      forCount: 0,
      againstVotes: 0,
      againstPercentage: 0,
      againstCount: 0,
      quorumCurrent: 0,
      quorumRequired: 50,
      quorumReached: false,
      votingPower: 0,
      showCurves: true,
      curves: null,
      progress: 0,
      currentApproval: 0,
      currentSupport: 0,
    },
    information: {
      votingSystem: "...",
      snapshot: "Loading",
      startBlock: null,
      endBlock: null,
      created: "Loading",
    },
    recentVoters: [],
    syncing: true,
  }

  const currentBountyData = bountyData || defaultData

  const handleBack = () => {
    if (window.history.length > 2) navigate(-1)
    else
      navigate(
        currentBountyData.communityId
          ? `/bounties/${currentBountyData.communityId}`
          : "/bounties/1",
      )
  }

  return (
    <div className="bounty-detail">
      <BountyBreadcrumb
        category={currentBountyData.category}
        proposalId={currentBountyData.id}
        onBack={handleBack}
      />

      <div className="bounty-detail__grid">
        <div className="bounty-detail__main">
          <BountyHeader
            id={currentBountyData.id}
            title={currentBountyData.title}
            category={currentBountyData.category}
            categoryColor={currentBountyData.categoryColor}
            status={currentBountyData.status}
            proposer={currentBountyData.proposer}
            startDate={currentBountyData.startDate}
            endDate={currentBountyData.endDate}
            syncing={syncing || !bountyData}
          />

          {/* Decision Deposit Alert Box */}
          {currentBountyData.decisionDepositNeeded && (
            <div className="bounty-detail__alert bounty-detail__alert--deposit">
              <div className="bounty-detail__alert-header">
                <span className="material-icons-round">info</span>
                <h3>Decision Deposit Required</h3>
              </div>
              <p>
                This proposal is in the <strong>Preparing</strong> stage. A
                Decision Deposit must be placed to enable enchantment.
              </p>
              <button
                onClick={handlePlaceDecisionDeposit}
                disabled={isDepositing}
                className="button-primary bounty-detail__deposit-button"
              >
                {isDepositing ? "Placing Deposit..." : "Place Decision Deposit"}
              </button>
            </div>
          )}

          <BountyDescription description={currentBountyData.description} />
          <BountyComments proposalId={currentBountyData.id} />
        </div>

        <div className="bounty-detail__sidebar">
          <BountyVotingResults
            voting={currentBountyData.voting}
            syncing={syncing || !bountyData}
          />

          {currentBountyData.status === "Active" && (
            <BountyVotingPanel
              timeLeft={currentBountyData.voting.timeLeft}
              onVote={handleVote}
              isVoting={isVoting}
            />
          )}

          <BountyInformation
            information={currentBountyData.information}
            syncing={syncing || !bountyData}
          />

          <BountyRecentVoters
            voters={currentBountyData.recentVoters}
            syncing={syncing || !bountyData}
          />
        </div>
      </div>
    </div>
  )
}

export default BountyDetail
