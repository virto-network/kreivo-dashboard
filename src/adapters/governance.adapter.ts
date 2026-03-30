import {
  Initiative,
  BountyDetailData,
  ReferendumStatus,
  RecentVoter,
} from "@/types/governance"
import { NostrProposalMetadata } from "@/types/nostr"
import { decodeStorageString } from "@/utils/substrate"

/**
 * Governance Adapters
 * Transform raw blockchain data (PAPI) into the dashboard's UI-friendly entities.
 */

/**
 * Maps a raw referendum entry to an Initiative UI object.
 */
export const toInitiative = async (
  refId: number,
  referendumInfo: any,
  typedApi: any,
  client: any,
): Promise<Initiative> => {
  try {
    let status: "active" | "completed" | "pending" = "pending"
    let ongoing: any = null
    let finalizedBlock: number | null = null

    if (referendumInfo.type === "Ongoing") {
      status = "active"
      ongoing = referendumInfo.value
    } else {
      status = "completed"
      const infoValue = referendumInfo.value
      if (Array.isArray(infoValue) && infoValue.length > 0) {
        finalizedBlock = Number(infoValue[0])
      } else if (typeof infoValue === "number") {
        finalizedBlock = infoValue
      }
    }

    if (status === "completed" && finalizedBlock) {
      try {
        const prevBlockNum = finalizedBlock - 1
        const blockHash =
          await typedApi.query.System.BlockHash.getValue(prevBlockNum)

        if (blockHash) {
          const histReferendum = (await client
            .getUnsafeApi()
            .query.CommunityReferenda.ReferendumInfoFor.getValue(refId, {
              at: blockHash,
            })) as any
          if (
            histReferendum &&
            (histReferendum.type === "Ongoing" || histReferendum.Ongoing)
          ) {
            ongoing = histReferendum.value || histReferendum.Ongoing
          }
        }
      } catch (histErr) {
        console.warn(
          `[toInitiative] Historical query failed for ref ${refId}`,
          histErr,
        )
      }
    }

    const tally = ongoing?.tally || { ayes: 0n, nays: 0n }
    const ayes = Number(tally.ayes || 0n)
    const nays = Number(tally.nays || 0n)
    const total = ayes + nays
    const progress = total > 0 ? Math.round((ayes / total) * 100) : 0

    if (status === "active") {
      if (ongoing?.deciding) status = "active"
      else status = "pending"
    }

    let name = `Initiative #${refId}`
    try {
      const metadataRaw =
        await typedApi.query.CommunityReferenda.MetadataOf.getValue(refId)
      const decoded = decodeStorageString(metadataRaw)
      if (decoded) name = decoded
    } catch (metaErr) {
      console.warn(`[toInitiative] No metadata for ${refId}`, metaErr)
    }

    return { id: refId, name, progress, status, ayes, nays }
  } catch (err) {
    console.error(`[toInitiative] Error mapping referendum ${refId}`, err)
    return {
      id: refId,
      name: `Initiative #${refId}`,
      progress: 0,
      status: "pending",
    }
  }
}

/**
 * Transforms a raw referendum and associated metadata into full BountyDetailData.
 * Centralizes the complex mapping logic previously in the BountyDetail view.
 */
export const toBountyDetailData = (
  id: string,
  status: ReferendumStatus,
  infoValue: any,
  metadata: NostrProposalMetadata | null,
  tally: { ayes: bigint; nays: bigint },
  counts: { ayes: number; nays: number },
  recentVoters: RecentVoter[],
  curves: any,
  blocks: {
    current: number
    submitted: number | null
    finalized: number | null
  },
  progress: number,
  timeLeft: string,
  totalMembers: number = 1,
): BountyDetailData => {
  const isPassed = status === "Passed"
  const totalVotes = Number(tally.ayes) + Number(tally.nays)
  const forPercentage =
    totalVotes > 0
      ? Math.round((Number(tally.ayes) / totalVotes) * 100)
      : isPassed
        ? 100
        : 0
  const againstPercentage =
    totalVotes > 0
      ? Math.round((Number(tally.nays) / totalVotes) * 100)
      : status === "Rejected" && Number(tally.nays) > 0
        ? 100
        : 0

  // Date Formatting Logic
  const optionsDate: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
  const optionsTime: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }

  let startDateStr: any = "N/A"
  let endDateStr: any = "N/A"

  const decisionPeriodBlocks = Number(curves?.decisionPeriod || 0)

  if (status === "Preparing") {
    if (metadata?.timestamp) {
      const startDate = new Date(metadata.timestamp)
      startDateStr = {
        date: startDate.toLocaleDateString("en-US", optionsDate),
        time: startDate.toLocaleTimeString("en-US", optionsTime),
      }
    }
    endDateStr = "Pending Deposit"
  } else if (status === "Active") {
    const elapsedBlocks = (progress / 100) * decisionPeriodBlocks
    const remainingBlocks = decisionPeriodBlocks - elapsedBlocks

    const startDate = new Date(Date.now() - elapsedBlocks * 6000)
    const endDate = new Date(Date.now() + remainingBlocks * 6000)

    startDateStr = {
      date: startDate.toLocaleDateString("en-US", optionsDate),
      time: startDate.toLocaleTimeString("en-US", optionsTime),
    }
    endDateStr = {
      date: endDate.toLocaleDateString("en-US", optionsDate),
      time: endDate.toLocaleTimeString("en-US", optionsTime),
    }
  } else if (
    (status === "Passed" || status === "Rejected") &&
    blocks.finalized
  ) {
    const finalizedElapsed = blocks.current - blocks.finalized
    const endDate = new Date(Date.now() - finalizedElapsed * 6000)

    // When passed or rejected, use the exact progress that was made to find the true start date
    const elapsedBlocks = (progress / 100) * decisionPeriodBlocks
    const trueDurationMs = elapsedBlocks > 0 ? elapsedBlocks * 6000 : 100 * 6000
    const startDate = new Date(endDate.getTime() - trueDurationMs)

    startDateStr = {
      date: startDate.toLocaleDateString("en-US", optionsDate),
      time: startDate.toLocaleTimeString("en-US", optionsTime),
    }
    endDateStr = {
      date: endDate.toLocaleDateString("en-US", optionsDate),
      time: endDate.toLocaleTimeString("en-US", optionsTime),
    }
  } else if (metadata?.timestamp) {
    const startDate = new Date(metadata.timestamp)
    startDateStr = {
      date: startDate.toLocaleDateString("en-US", optionsDate),
      time: startDate.toLocaleTimeString("en-US", optionsTime),
    }
  }

  let currentApprovalNeeded = 0
  let currentSupportNeeded = 0

  if (curves) {
    const evaluate = (curve: any, decisionPeriod: number, p: number) => {
      if (!curve || !decisionPeriod) return 0
      if (curve.type === "LinearDecreasing") {
        let knee = 100
        if (curve.length && decisionPeriod > 0)
          knee = (curve.length / decisionPeriod) * 100
        if (knee > 100) knee = 100
        if (p >= knee || knee === 0) return curve.end
        return curve.start - (p / knee) * (curve.start - curve.end)
      } else if (curve.type === "Reciprocal") {
        const xInfo = (p / 100) * decisionPeriod
        const num = BigInt(curve.factor || 0)
        const den = BigInt(Math.floor(xInfo)) + BigInt(curve.xOffset || 0)
        if (den === 0n) return 100
        const yVal = Number(num / den) + (curve.yOffset || 0)
        return (yVal / 1_000_000_000) * 100
      }
      return curve.start !== undefined
        ? p >= 100
          ? curve.end
          : curve.start - (p / 100) * (curve.start - curve.end)
        : 0
    }
    currentApprovalNeeded = evaluate(
      curves.approval,
      curves.decisionPeriod,
      progress,
    )
    currentSupportNeeded = evaluate(
      curves.support,
      curves.decisionPeriod,
      progress,
    )
  }

  return {
    id,
    title:
      typeof metadata?.title === "string" &&
      metadata.title.trim() !== "" &&
      metadata.title !== "undefined"
        ? metadata.title
        : `Proposal #${id}`,
    category: metadata?.track || "Uncategorized",
    categoryColor: "orange",
    communityId: metadata?.communityId || null,
    status: status,
    track: metadata?.track || "all",
    decisionDepositNeeded: status === "Preparing",
    proposer: {
      address:
        infoValue?.submission_deposit?.who ||
        infoValue?.[1]?.who ||
        metadata?.proposer ||
        "Unknown",
    },
    startDate: startDateStr,
    endDate: endDateStr,
    description:
      typeof metadata?.description === "string" &&
      metadata.description.trim() !== "" &&
      metadata.description !== "undefined"
        ? metadata.description
        : "No description available",
    voting: {
      timeLeft,
      supportThreshold: 50,
      approvalThreshold: 60,
      forVotes:
        Number(tally.ayes) /
        (tally.ayes < 1000000n && tally.nays < 1000000n
          ? 1
          : 1_000_000_000_000),
      forPercentage,
      forCount: counts.ayes,
      againstVotes:
        Number(tally.nays) /
        (tally.ayes < 1000000n && tally.nays < 1000000n
          ? 1
          : 1_000_000_000_000),
      againstPercentage,
      againstCount: counts.nays,
      quorumCurrent:
        status === "Passed"
          ? 100
          : Math.round((counts.ayes / totalMembers) * 10000) / 100, // True OpenGov support percentage
      quorumRequired: 50,
      quorumReached: isPassed,
      votingPower: 0,
      showCurves: true,
      curves,
      progress,
      currentApproval: currentApprovalNeeded,
      currentSupport: currentSupportNeeded,
    },
    information: {
      votingSystem: metadata?.track
        ? `Community ${metadata.track}`
        : "Community Governance",
      snapshot: blocks.finalized ? String(blocks.finalized) : "N/A",
      startBlock: blocks.submitted,
      endBlock: blocks.finalized,
      created:
        startDateStr && typeof startDateStr === "object"
          ? startDateStr.date
          : "Unknown",
    },
    recentVoters,
    syncing: false,
  }
}

/**
 * Extracts decision curve values from chain data and normalizes them for the UI.
 */
export const extractCurve = (curve: any, decisionPeriod: number) => {
  if (!curve) return { start: 0, end: 0 }

  const normalize = (val: any) => (Number(val) / 1_000_000_000) * 100

  if (curve.type === "LinearDecreasing") {
    return {
      type: "LinearDecreasing",
      start: normalize(curve.value.ceil),
      end: normalize(curve.value.floor),
      length: curve.value.length ? Number(curve.value.length) : decisionPeriod,
    }
  } else if (curve.type === "Reciprocal") {
    return {
      type: "Reciprocal",
      factor: Number(curve.value.factor),
      xOffset: Number(curve.value.x_offset),
      yOffset: Number(curve.value.y_offset),
      length: decisionPeriod,
    }
  } else if (curve.type === "SteppedDecreasing") {
    return {
      type: "SteppedDecreasing",
      begin: normalize(curve.value.begin),
      end: normalize(curve.value.end),
      step: normalize(curve.value.step),
      period: normalize(curve.value.period),
      length: decisionPeriod,
    }
  }

  return { start: 0, end: 0, type: "Unknown" }
}
