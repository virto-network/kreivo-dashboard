import React, { useState } from "react"
interface BountyVotingPanelProps {
  timeLeft: string
  onVote: (voteType: "for" | "against" | "abstain") => void
  isVoting?: boolean
}

const BountyVotingPanel: React.FC<BountyVotingPanelProps> = ({
  timeLeft,
  onVote,
  isVoting = false,
}) => {
  const [selectedVote, setSelectedVote] = useState<
    "for" | "against" | "abstain" | null
  >(null)

  const handleVoteSelection = (voteType: "for" | "against" | "abstain") => {
    setSelectedVote(voteType)
  }

  return (
    <div className="bounty-voting-panel">
      <h3 className="bounty-voting-panel__title">Cast your vote</h3>
      <p className="bounty-voting-panel__subtitle">
        Voting ends in {timeLeft}.
      </p>

      <div className="bounty-voting-panel__options">
        <button
          className={`bounty-voting-panel__option bounty-voting-panel__option--for ${selectedVote === "for" ? "bounty-voting-panel__option--selected" : ""}`}
          onClick={() => handleVoteSelection("for")}
        >
          <span className="bounty-voting-panel__option-label">Vote For</span>
          <div className="bounty-voting-panel__option-radio">
            <div className="bounty-voting-panel__option-radio-dot"></div>
          </div>
        </button>

        <button
          className={`bounty-voting-panel__option bounty-voting-panel__option--against ${selectedVote === "against" ? "bounty-voting-panel__option--selected" : ""}`}
          onClick={() => handleVoteSelection("against")}
        >
          <span className="bounty-voting-panel__option-label">Vote Against</span>
          <div className="bounty-voting-panel__option-radio">
            <div className="bounty-voting-panel__option-radio-dot"></div>
          </div>
        </button>

        <button
          className={`bounty-voting-panel__option bounty-voting-panel__option--abstain ${selectedVote === "abstain" ? "bounty-voting-panel__option--selected" : ""}`}
          onClick={() => handleVoteSelection("abstain")}
        >
          <span className="bounty-voting-panel__option-label">Abstain</span>
          <div className="bounty-voting-panel__option-radio">
            <div className="bounty-voting-panel__option-radio-dot"></div>
          </div>
        </button>
      </div>

      <button
        onClick={() => {
          if (selectedVote) {
            onVote(selectedVote);
            setSelectedVote(null);
          }
        }}
        disabled={!selectedVote || isVoting}
        className="button-primary"
        style={{
          width: "100%",
          padding: "12px",
          background: !selectedVote || isVoting ? "#374151" : "#eab308",
          color: !selectedVote || isVoting ? "#9ca3af" : "#000000",
          border: "none",
          borderRadius: "8px",
          fontWeight: 600,
          cursor: !selectedVote || isVoting ? "not-allowed" : "pointer",
          marginTop: "16px",
        }}
      >
        {isVoting ? "Signing Vote..." : "Confirm Vote"}
      </button>
    </div>
  )
}

export default BountyVotingPanel
