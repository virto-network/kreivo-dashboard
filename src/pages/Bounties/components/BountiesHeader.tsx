import { useNavigate } from "react-router-dom"
import BackButton from "@/components/ui/BackButton/BackButton"

interface BountiesHeaderProps {
  communityId?: string
}

export const BountiesHeader: React.FC<BountiesHeaderProps> = ({
  communityId,
}) => {
  const navigate = useNavigate()

  return (
    <div className="bounties-header">
      <div className="bounties-header-left">
        <BackButton />
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
  )
}
