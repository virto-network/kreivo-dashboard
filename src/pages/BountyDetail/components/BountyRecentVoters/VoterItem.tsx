import React from "react"
import { formatAddress } from "@/utils/substrate"

interface Voter {
  address: string
  vote: string
  amount?: number
}

interface VoterItemProps {
  voter: Voter
}

/**
 * Individual Voter display component.
 */
const VoterItem: React.FC<VoterItemProps> = ({ voter }) => {
  const voteType = voter.vote.toLowerCase()

  return (
    <div className="bounty-recent-voters__item">
      <span className="bounty-recent-voters__address" title={voter.address}>
        {formatAddress(voter.address)}
      </span>
      <span
        className={`bounty-recent-voters__vote bounty-recent-voters__vote--${voteType}`}
      >
        {voter.vote}
      </span>
    </div>
  )
}

export default VoterItem
