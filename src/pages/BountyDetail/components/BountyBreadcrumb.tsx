import React from "react"
import BackButton from "@/components/ui/BackButton/BackButton"

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
      <BackButton label="Back to Board" onClick={onBack} />
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
