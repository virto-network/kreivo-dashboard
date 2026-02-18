import React from "react"

interface Voter {
  address: string
  vote: string
}

interface BountyRecentVotersProps {
  voters: Voter[]
}

const BountyRecentVoters: React.FC<BountyRecentVotersProps> = ({ voters }) => {
  return (
    <div className="bounty-recent-voters">
      <div className="bounty-recent-voters__header">
        <h3 className="bounty-recent-voters__title">Recent Voters</h3>
        <button className="bounty-recent-voters__view-all">View All</button>
      </div>

      <div className="bounty-recent-voters__list">
        {voters.map((voter, index) => (
          <div key={index} className="bounty-recent-voters__item">
            <span className="bounty-recent-voters__address">{voter.address}</span>
            <span
              className={`bounty-recent-voters__vote bounty-recent-voters__vote--${voter.vote.toLowerCase()}`}
            >
              {voter.vote}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BountyRecentVoters

