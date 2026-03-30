import React from "react"

type Track = "all" | "grants" | "treasury" | "operations"

interface BountyFilterBarProps {
  selectedTrack: Track
  onTrackChange: (track: Track) => void
}

const TRACKS: { value: Track; label: string }[] = [
  { value: "all", label: "All Tracks" },
  { value: "grants", label: "Grants Track" },
  { value: "treasury", label: "Treasury Track" },
  { value: "operations", label: "Operations Track" },
]

export const BountyFilterBar: React.FC<BountyFilterBarProps> = ({
  selectedTrack,
  onTrackChange,
}) => (
  <div className="bounties-filter">
    <div className="bounties-filter-label">Filter by Track:</div>
    <div className="bounties-filter-buttons">
      {TRACKS.map(({ value, label }) => (
        <button
          key={value}
          className={`bounties-filter-button ${selectedTrack === value ? "bounties-filter-button--active" : ""}`}
          onClick={() => onTrackChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
)
