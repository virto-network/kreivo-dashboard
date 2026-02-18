import React from "react"

interface BountyInformationProps {
  information: {
    votingSystem: string
    snapshot: string
    created: string
  }
}

const BountyInformation: React.FC<BountyInformationProps> = ({ information }) => {
  return (
    <div className="bounty-information">
      <h3 className="bounty-information__title">Information</h3>

      <ul className="bounty-information__list">
        <li className="bounty-information__item">
          <span className="bounty-information__label">Voting System</span>
          <span className="bounty-information__value">
            {information.votingSystem}
          </span>
        </li>

        <li className="bounty-information__item">
          <span className="bounty-information__label">Snapshot</span>
          <a href="#" className="bounty-information__link">
            {information.snapshot}
            <span className="material-symbols-outlined bounty-information__link-icon">
              open_in_new
            </span>
          </a>
        </li>

        <li className="bounty-information__item">
          <span className="bounty-information__label">Created</span>
          <span className="bounty-information__value">{information.created}</span>
        </li>
      </ul>
    </div>
  )
}

export default BountyInformation

