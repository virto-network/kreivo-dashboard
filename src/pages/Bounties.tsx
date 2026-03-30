import React, { useState } from "react"
import { useBounties } from "./Bounties/hooks/useBounties"
import { BountiesHeader } from "./Bounties/components/BountiesHeader"
import { BountyFilterBar } from "./Bounties/components/BountyFilterBar"
import { BountyColumn } from "./Bounties/components/BountyColumn"
import { Bounty } from "@/types/governance"
import "./Bounties/Bounties.css"

type Track = "all" | "grants" | "treasury" | "operations"

const filterByTrack = (bounties: Bounty[], track: Track) =>
  track === "all" ? bounties : bounties.filter((b) => b.track === track)

const Bounties: React.FC = () => {
  const [selectedTrack, setSelectedTrack] = useState<Track>("all")
  const { bounties, syncing, communityId } = useBounties()

  const preparing = filterByTrack(
    bounties.filter((b) => b.status === "Preparing"),
    selectedTrack,
  )
  const active = filterByTrack(
    bounties.filter((b) => b.status === "Active"),
    selectedTrack,
  )
  const passed = filterByTrack(
    bounties.filter((b) => b.status === "Passed"),
    selectedTrack,
  )
  const executed = filterByTrack(
    bounties.filter((b) => b.status === "Executed"),
    selectedTrack,
  )
  const rejected = filterByTrack(
    bounties.filter((b) => b.status === "Rejected"),
    selectedTrack,
  )

  return (
    <div className="bounties-page">
      <BountiesHeader communityId={communityId} />

      <BountyFilterBar
        selectedTrack={selectedTrack}
        onTrackChange={setSelectedTrack}
      />

      <div className="bounties-board">
        <BountyColumn
          title="Preparing"
          variant="preparing"
          bounties={preparing}
          showSkeleton={syncing && preparing.length === 0}
          skeletonCount={1}
        />
        <BountyColumn
          title="Active"
          variant="active"
          bounties={active}
          isActive
          showSkeleton={syncing && active.length === 0}
          skeletonCount={2}
        />
        <BountyColumn
          title="Passed"
          variant="passed"
          bounties={passed}
          showSkeleton={syncing && passed.length === 0}
          skeletonCount={3}
        />
        <BountyColumn
          title="Executed"
          variant="executed"
          bounties={executed}
          showSkeleton={syncing && executed.length === 0}
          skeletonCount={1}
        />
        <BountyColumn
          title="Rejected"
          variant="rejected"
          bounties={rejected}
          showSkeleton={syncing && rejected.length === 0}
          skeletonCount={1}
        />
      </div>
    </div>
  )
}

export default Bounties
