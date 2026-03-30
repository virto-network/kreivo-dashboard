import { Bounty, ReferendumStatus } from "@/types/governance"
import { NostrProposalMetadata } from "@/types/nostr"

type CategoryColor = "purple" | "orange" | "blue" | "gray"

export const getCategoryColor = (track?: string): CategoryColor => {
  switch (track) {
    case "grants":
      return "purple"
    case "treasury":
      return "orange"
    case "operations":
      return "blue"
    default:
      return "gray"
  }
}

export const parseReferendumStatus = (
  info: any,
): {
  status: ReferendumStatus
  tally: { ayes: any; nays: any }
  finishedAtBlock: number | undefined
} => {
  let status: ReferendumStatus = "Unknown"
  let tally = { ayes: 0 as any, nays: 0 as any }
  let finishedAtBlock: number | undefined

  if (info.type === "Ongoing") {
    status = "Active"
    const ongoing = info.value
    tally = ongoing.tally
    if (!ongoing.decision_deposit) status = "Preparing"
  } else if (
    info.type === "Approved" ||
    info.type === "Rejected" ||
    info.type === "Cancelled" ||
    info.type === "TimedOut" ||
    info.type === "Killed"
  ) {
    status = info.type === "Approved" ? "Passed" : "Rejected"
    const infoValue = info.value as any

    if (Array.isArray(infoValue) && infoValue.length > 0) {
      finishedAtBlock = Number(infoValue[0])
    } else if (infoValue && typeof infoValue === "object") {
      if (infoValue.when !== undefined) finishedAtBlock = Number(infoValue.when)
      else if (infoValue.block !== undefined)
        finishedAtBlock = Number(infoValue.block)
      else if (infoValue[0] !== undefined)
        finishedAtBlock = Number(infoValue[0])
    } else if (typeof infoValue === "number") {
      finishedAtBlock = infoValue
    }
  }

  return { status, tally, finishedAtBlock }
}

export const toBounty = (
  referendumId: string,
  status: ReferendumStatus,
  tally: { ayes: any; nays: any },
  metadata: NostrProposalMetadata | null,
  referendumSubmittedBlock?: number,
  finishedAtBlock?: number,
): Bounty => {
  const totalVotes = Number(tally.ayes) + Number(tally.nays)
  const forPercentage =
    totalVotes > 0 ? Math.round((Number(tally.ayes) / totalVotes) * 100) : 0
  const againstPercentage =
    totalVotes > 0 ? Math.round((Number(tally.nays) / totalVotes) * 100) : 0

  return {
    id: referendumId,
    title:
      typeof metadata?.title === "string" &&
      metadata.title.trim() !== "" &&
      metadata.title !== "undefined"
        ? metadata.title
        : `Proposal #${referendumId}`,
    description:
      typeof metadata?.description === "string" &&
      metadata.description.trim() !== "" &&
      metadata.description !== "undefined"
        ? metadata.description
        : "No description available",
    category: metadata?.track || "Uncategorized",
    categoryColor: getCategoryColor(metadata?.track),
    status,
    track: metadata?.track || "all",
    startBlock: referendumSubmittedBlock,
    endBlock: finishedAtBlock,
    votingStats: {
      for: forPercentage,
      against: againstPercentage,
    },
  }
}

export const toInitialBounty = (
  hash: string,
  meta: NostrProposalMetadata,
): Bounty => ({
  id: hash,
  title:
    typeof meta.title === "string" && meta.title.trim() !== ""
      ? meta.title
      : `Proposal #${hash}`,
  description:
    typeof meta.description === "string" && meta.description.trim() !== ""
      ? meta.description
      : "No description available",
  category: meta.track ? `Community ${meta.track}` : "Uncategorized",
  categoryColor: getCategoryColor(meta.track),
  status: "Loading blockchain...",
  track: meta.track || "all",
})
