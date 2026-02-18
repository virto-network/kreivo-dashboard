import React, { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { chainClient$ } from "@/state/chains/chain.state"
import { firstValueFrom, take } from "rxjs"
import { kreivo } from "@polkadot-api/descriptors"
import { NostrService } from "@/services/nostr"
import "./Bounties.css"

interface Bounty {
  id: string
  title: string
  description: string
  category: string
  categoryColor: string
  timeLeft?: string
  votingStats?: {
    for: number
    against: number
  }
  status?: string
  track?: string
}

type Track = "all" | "grants" | "treasury" | "operations"

const Bounties: React.FC = () => {
  const navigate = useNavigate()
  const { communityId } = useParams<{ communityId: string }>()
  const [selectedTrack, setSelectedTrack] = useState<Track>("all")

  const [bounties, setBounties] = useState<Bounty[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBounties = async () => {
      try {
        const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
        if (!client) return

        const typedApi = client.getTypedApi(kreivo)
        const referendaEntries = await typedApi.query.CommunityReferenda.ReferendumInfoFor.getEntries()

        const fetchedBounties: Bounty[] = []

        for (const { keyArgs, value } of referendaEntries) {
          const [referendumId] = keyArgs
          const info = value

          let status = "Unknown"
          let proposalHash = referendumId.toString()
          let tally = { ayes: 0, nays: 0 }

          if (info.type === 'Ongoing') {
            status = "Active Voting"
            const ongoing = info.value
            // @ts-ignore
            tally = ongoing.tally

            if (ongoing.proposal.type === 'Inline') {
              proposalHash = referendumId.toString();

            } else if (ongoing.proposal.type === 'Lookup') {
              proposalHash = referendumId.toString();

            }

            // Check for decision deposit
            // @ts-ignore
            if (!ongoing.decision_deposit) {
              status = "Preparing";
            }
          } else if (info.type === 'Approved') {
            status = "Passed"
            proposalHash = referendumId.toString();
          } else if (info.type === 'Rejected' || info.type === 'Cancelled' || info.type === 'TimedOut' || info.type === 'Killed') {
            status = "Rejected"
          }

          let metadata: any = null
          if (proposalHash) {
            metadata = await NostrService.getProposalMetadata(proposalHash)
          }

          if (communityId) {
            const communityIdNumber = parseInt(communityId, 10)
            // console.log(`Filtering: proposalId=${referendumId}, metadata.communityId=${metadata?.communityId}, filter=${communityIdNumber}`)

            if (metadata?.communityId !== communityIdNumber) {
              // console.log(`Skipping proposal ${referendumId} - community mismatch`)
              continue; // Skip this proposal if it doesn't belong to this community
            }
          }

          const totalVotes = Number(tally.ayes) + Number(tally.nays)
          const forPercentage = totalVotes > 0 ? Math.round((Number(tally.ayes) / totalVotes) * 100) : 0
          const againstPercentage = totalVotes > 0 ? Math.round((Number(tally.nays) / totalVotes) * 100) : 0

          fetchedBounties.push({
            id: referendumId.toString(),
            title: metadata?.title || `Proposal #${referendumId}`,
            description: metadata?.description || "No description available",
            category: metadata?.track || "Uncategorized",
            categoryColor: getCategoryColor(metadata?.track),
            status: status,
            track: metadata?.track || "all",
            votingStats: {
              for: forPercentage,
              against: againstPercentage
            }
          })
        }
        setBounties(fetchedBounties)
      } catch (err) {
        console.error("Error fetching bounties:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchBounties()
  }, [])

  const getCategoryColor = (track?: string) => {
    switch (track) {
      case 'grants': return 'purple'
      case 'treasury': return 'orange'
      case 'operations': return 'blue'
      default: return 'gray'
    }
  }

  // Group bounties by status for the board columns
  const preparingBounties = bounties.filter(b => b.status === 'Preparing')
  const activeVotingBounties = bounties.filter(b => b.status === 'Active Voting')
  const passedBounties = bounties.filter(b => b.status === 'Passed')
  const executedBounties = bounties.filter(b => b.status === 'Executed')
  const rejectedBounties = bounties.filter(b => b.status === 'Rejected')


  const filterBounties = (bounties: Bounty[]) => {
    if (selectedTrack === "all") return bounties
    return bounties.filter((bounty) => bounty.track === selectedTrack)
  }

  const renderBountyCard = (bounty: Bounty, isActive = false) => (
    <div
      key={bounty.id}
      className={`bounty-card ${isActive ? "bounty-card-active" : ""}`}
      onClick={() => navigate(`/bounty/${bounty.id}`)}
    >
      {isActive && <div className="bounty-card-accent"></div>}
      <div className="bounty-card-header">
        <span className={`bounty-category bounty-category-${bounty.categoryColor}`}>
          {bounty.category}
        </span>
        {bounty.timeLeft ? (
          <div className={`bounty-time ${isActive ? "bounty-time-active" : ""}`}>
            <span className="material-icons-round bounty-time-icon">timer</span>
            {bounty.timeLeft}
          </div>
        ) : bounty.status ? (
          <span className="bounty-status">{bounty.status}</span>
        ) : (
          <span className="bounty-id">#{bounty.id}</span>
        )}
      </div>
      <h3 className="bounty-title">{bounty.title}</h3>
      <p className="bounty-description">{bounty.description}</p>
      {bounty.votingStats && bounty.status === 'Active Voting' && (
        <div className="bounty-voting">
          <div className="bounty-voting-labels">
            <span className="bounty-voting-for">For {bounty.votingStats.for}%</span>
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
      {!bounty.timeLeft && !bounty.status && (
        <div className="bounty-footer">
          <span className="bounty-id">#{bounty.id}</span>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="bounties-page">
        <div className="bounties-header">
          <h1 className="bounties-title">Loading Proposals...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="bounties-page">
      <div className="bounties-header">
        <div className="bounties-header-left">
          <button className="bounties-back-button" onClick={() => navigate(-1)}>
            <span className="material-icons-round">arrow_back</span>
          </button>
          <h1 className="bounties-title">
            Community #{communityId} - Governance Kanban Board
          </h1>
        </div>
        <button
          className="bounties-create-button"
          onClick={() => navigate(`/create-proposal?communityId=${communityId}`)}
        >
          <span className="material-icons-round">add</span>
          Create Proposal
        </button>
      </div>

      {/* Track Filter */}
      <div className="bounties-filter">
        <div className="bounties-filter-label">Filter by Track:</div>
        <div className="bounties-filter-buttons">
          <button
            className={`bounties-filter-button ${selectedTrack === "all" ? "bounties-filter-button--active" : ""}`}
            onClick={() => setSelectedTrack("all")}
          >
            All Tracks
          </button>
          <button
            className={`bounties-filter-button ${selectedTrack === "grants" ? "bounties-filter-button--active" : ""}`}
            onClick={() => setSelectedTrack("grants")}
          >
            Grants Track
          </button>
          <button
            className={`bounties-filter-button ${selectedTrack === "treasury" ? "bounties-filter-button--active" : ""}`}
            onClick={() => setSelectedTrack("treasury")}
          >
            Treasury Track
          </button>
          <button
            className={`bounties-filter-button ${selectedTrack === "operations" ? "bounties-filter-button--active" : ""}`}
            onClick={() => setSelectedTrack("operations")}
          >
            Operations Track
          </button>
        </div>
      </div>

      <div className="bounties-board">
        {/* Preparing Column */}
        <div className="bounties-column">
          <div className="bounties-column-header">
            <h2 className="bounties-column-title bounties-column-title-preparing">
              Preparing
            </h2>
            <button className="bounties-column-menu">
              <span className="material-icons-round">more_vert</span>
            </button>
          </div>
          <div className="bounties-column-content">
            {filterBounties(preparingBounties).map((bounty) =>
              renderBountyCard(bounty),
            )}
          </div>
        </div>

        {/* Active Voting Column */}
        <div className="bounties-column">
          <div className="bounties-column-header">
            <h2 className="bounties-column-title bounties-column-title-active">
              Active Voting
              <span className="bounties-pulse">
                <span className="bounties-pulse-ring"></span>
                <span className="bounties-pulse-dot"></span>
              </span>
            </h2>
            <button className="bounties-column-menu">
              <span className="material-icons-round">more_vert</span>
            </button>
          </div>
          <div className="bounties-column-content">
            {filterBounties(activeVotingBounties).map((bounty) =>
              renderBountyCard(bounty, true),
            )}
          </div>
        </div>

        {/* Passed Column */}
        <div className="bounties-column">
          <div className="bounties-column-header">
            <h2 className="bounties-column-title bounties-column-title-passed">
              Passed
            </h2>
            <button className="bounties-column-menu">
              <span className="material-icons-round">more_vert</span>
            </button>
          </div>
          <div className="bounties-column-content">
            {filterBounties(passedBounties).map((bounty) =>
              renderBountyCard(bounty),
            )}
          </div>
        </div>

        {/* Executed Column */}
        <div className="bounties-column">
          <div className="bounties-column-header">
            <h2 className="bounties-column-title bounties-column-title-executed">
              Executed
            </h2>
            <button className="bounties-column-menu">
              <span className="material-icons-round">more_vert</span>
            </button>
          </div>
          <div className="bounties-column-content">
            {filterBounties(executedBounties).map((bounty) =>
              renderBountyCard(bounty),
            )}
          </div>
        </div>

        {/* Rejected Column */}
        <div className="bounties-column">
          <div className="bounties-column-header">
            <h2 className="bounties-column-title bounties-column-title-rejected">
              Rejected
            </h2>
            <button className="bounties-column-menu">
              <span className="material-icons-round">more_vert</span>
            </button>
          </div>
          <div className="bounties-column-content">
            {filterBounties(rejectedBounties).map((bounty) =>
              renderBountyCard(bounty),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Bounties

