import React from "react"

interface BountyBreadcrumbProps {
  category: string
  proposalId: string
  onBack: () => void
}

const BountyBreadcrumb: React.FC<BountyBreadcrumbProps> = ({
  category,
  proposalId,
  onBack,
}) => {
  return (
    <div className="bounty-breadcrumb">
      <button className="bounty-breadcrumb__back-button" onClick={onBack}>
        <span className="material-symbols-outlined bounty-breadcrumb__back-icon">
          arrow_back
        </span>
        Back to Board
      </button>
      <span className="bounty-breadcrumb__separator">/</span>
      <span className="bounty-breadcrumb__item bounty-breadcrumb__item--category">
        {category}
      </span>
      <span className="bounty-breadcrumb__separator">/</span>
      <span className="bounty-breadcrumb__item bounty-breadcrumb__item--active">
        Proposal #{proposalId}
      </span>
    </div>
  )
}

export default BountyBreadcrumb

