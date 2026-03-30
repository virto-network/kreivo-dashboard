import { useState, useEffect, useCallback, useRef } from "react"
import { firstValueFrom } from "rxjs"
import { take } from "rxjs/operators"
import { chainClient$ } from "@/state/chains/chain.state"
import { kreivo } from "@polkadot-api/descriptors"
import { createClient } from "polkadot-api"
import { getWsProvider } from "@polkadot-api/ws-provider/web"
import { createClient as createSubstrateClient } from "@polkadot-api/substrate-client"
import { getDynamicBuilder, getLookupFn } from "@polkadot-api/metadata-builders"
import { decAnyMetadata, unifyMetadata } from "@polkadot-api/substrate-bindings"
import { NostrService } from "@/services/nostr"
import { useVirto } from "@/contexts/VirtoContext"
import {
  BountyDetailData,
  ReferendumStatus,
  RecentVoter,
} from "@/types/governance"
import { NostrProposalMetadata } from "@/types/nostr"
import { toBountyDetailData, extractCurve } from "@/adapters/governance.adapter"

/**
 * Hook to manage the state and logic for a specific Bounty Detail.
 * Orchestrates dual-source fetching (Nostr + Blockchain) and handles transactions.
 */
export const useBountyDetail = (id?: string) => {
  const { sdk, userAddress } = useVirto()
  const [bountyData, setBountyData] = useState<BountyDetailData | null>(null)
  const [syncing, setSyncing] = useState(true)
  const [isVoting, setIsVoting] = useState(false)
  const [isDepositing, setIsDepositing] = useState(false)
  const [membershipId, setMembershipId] = useState<number | null>(null)

  const currentId = useRef(id)
  useEffect(() => {
    currentId.current = id
  }, [id])

  const fetchMembership = useCallback(async () => {
    if (!userAddress) return
    try {
      const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
      if (!client) return
      const typedApi = client.getTypedApi(kreivo)
      const entries =
        await typedApi.query.CommunityMemberships.Account.getEntries(
          userAddress,
        )

      if (entries && entries.length > 0) {
        setMembershipId(Number(entries[0].keyArgs[2]))
      }
    } catch (err) {
      console.error("[useBountyDetail] Error fetching membership:", err)
    }
  }, [userAddress])

  const fetchData = useCallback(async () => {
    if (!id) return
    setSyncing(true)

    let metadata: NostrProposalMetadata | null = null

    try {
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 500),
      )
      metadata = await Promise.race([
        NostrService.getProposalMetadata(id),
        timeoutPromise,
      ])
    } catch (e) {
      console.warn("[useBountyDetail] Nostr pre-fetch error", e)
    }

    try {
      const wsProvider = getWsProvider("wss://kreivo.io")
      const client = createClient(wsProvider)
      const typedApi = client.getTypedApi(kreivo)

      const [currentBlockNum, referendumInfo, metadataRaw] = await Promise.all([
        typedApi.query.System.Number.getValue(),
        typedApi.query.CommunityReferenda.ReferendumInfoFor.getValue(
          Number(id),
        ),
        kreivo.getMetadata(),
      ])

      if (!referendumInfo) return

      const currentBlock = Number(currentBlockNum)
      const chainMetadata = unifyMetadata(decAnyMetadata(metadataRaw))
      const dynamicBuilder = getDynamicBuilder(getLookupFn(chainMetadata))
      const storageBuilder = dynamicBuilder.buildStorage(
        "CommunityReferenda",
        "ReferendumInfoFor",
      )

      let status: ReferendumStatus = "Unknown"
      let tally = { ayes: 0n, nays: 0n }
      let infoValue: any = null
      let finalizedAtBlock: number | null = null
      let submittedBlock: number | null = null
      let decidingSinceBlock: number | null = null

      if (referendumInfo.type === "Ongoing") {
        status = "Active"
        infoValue = referendumInfo.value
        tally = infoValue.tally
        if (infoValue.submitted !== undefined)
          submittedBlock = Number(infoValue.submitted)
        if (infoValue.deciding)
          decidingSinceBlock = Number(infoValue.deciding.since)
        if (!infoValue.decision_deposit) status = "Preparing"
      } else {
        status =
          referendumInfo.type === "Approved"
            ? "Passed"
            : (referendumInfo.type as ReferendumStatus)
        infoValue = referendumInfo.value

        if (Array.isArray(infoValue)) finalizedAtBlock = Number(infoValue[0])
        else if (infoValue?.when) finalizedAtBlock = Number(infoValue.when)
        else if (infoValue?.block) finalizedAtBlock = Number(infoValue.block)

        if (finalizedAtBlock) {
          try {
            const substrateClient = createSubstrateClient(wsProvider)
            const histBlockHash = (await substrateClient.request(
              "chain_getBlockHash",
              [finalizedAtBlock - 1],
            )) as string
            if (
              histBlockHash &&
              histBlockHash !==
                "0x0000000000000000000000000000000000000000000000000000000000000000"
            ) {
              const keyStr =
                await typedApi.query.CommunityReferenda.ReferendumInfoFor.getKey(
                  Number(id),
                )
              const storageHex = await substrateClient.request(
                "state_getStorage",
                [keyStr, histBlockHash],
              )
              if (storageHex) {
                try {
                  const histRef = storageBuilder.value.dec(
                    storageHex as string,
                  ) as any
                  if (histRef?.type === "Ongoing") {
                    if (histRef.value?.submitted !== undefined) {
                      submittedBlock = Number(histRef.value.submitted)
                    }
                    if (
                      histRef.value?.deciding &&
                      histRef.value.deciding.since !== undefined
                    ) {
                      decidingSinceBlock = Number(histRef.value.deciding.since)
                    }
                  } else if (histRef?.Ongoing) {
                    if (histRef.Ongoing.submitted !== undefined)
                      submittedBlock = Number(histRef.Ongoing.submitted)
                    if (histRef.Ongoing.deciding?.since !== undefined)
                      decidingSinceBlock = Number(
                        histRef.Ongoing.deciding.since,
                      )
                  }
                } catch (parseErr) {
                  console.warn("Storage decode parsing error", parseErr)
                }
              }
            }
          } catch (e) {
            console.warn("[useBountyDetail] Historical start lookup failed", e)
          }
        }
      } // <--- Added closing brace for `else` block starting on line 93

      if (!metadata) {
        try {
          metadata = await NostrService.getProposalMetadata(id)
        } catch {
          /* ok */
        }
      }

      if (status !== "Active" && status !== "Preparing") {
        if (submittedBlock === null && metadata?.timestamp) {
          const blocksDiff = Math.floor(
            (Date.now() - metadata.timestamp) / 6000,
          )
          submittedBlock = Math.max(1, currentBlock - blocksDiff)
        }

        if (submittedBlock === null && finalizedAtBlock !== null) {
          submittedBlock = Math.max(1, finalizedAtBlock - 100800)
        }

        if (decidingSinceBlock === null) {
          decidingSinceBlock = submittedBlock
        }
      }

      let countAyes = 0,
        countNays = 0
      let recAyes = 0n,
        recNays = 0n
      const recentVoters: RecentVoter[] = []

      try {
        const votesResult =
          await typedApi.query.Communities.CommunityVotes.getEntries(Number(id))
        const communityId =
          (metadata as any)?.communityId !== undefined
            ? Number((metadata as any).communityId)
            : 1

        for (const entry of votesResult) {
          const memberId = entry.keyArgs[1]
          const voteData = entry.value[0]
          let balance = 0n
          const direction =
            voteData.type === "Standard" ? voteData.value : voteData.value[0]

          if (voteData.type === "NativeBalance") balance = voteData.value[1]
          else if (voteData.type === "AssetBalance") balance = voteData.value[2]
          else balance = 1n

          if (direction) {
            recAyes += balance
            countAyes++
          } else {
            recNays += balance
            countNays++
          }

          let owner = `Member #${memberId}`
          try {
            const item =
              await typedApi.query.CommunityMemberships.Item.getValue(
                communityId,
                memberId,
              )
            if ((item as any)?.owner) owner = (item as any).owner
          } catch (err) {
            console.warn(
              `[useBountyDetail] Owner fetch for ${memberId} failed`,
              err,
            )
          }

          recentVoters.push({
            address: owner,
            vote: direction ? "for" : "against",
            amount:
              balance > 1000000n
                ? Number(balance) / 1_000_000_000_000
                : Number(balance),
            timestamp: "Recorded",
          })
        }
      } catch (err) {
        console.error("[useBountyDetail] Votes fetch failed", err)
      }

      if (
        Number(tally.ayes) + Number(tally.nays) === 0 &&
        (recAyes > 0n || recNays > 0n)
      ) {
        tally = { ayes: recAyes, nays: recNays }
      }

      let curves: any = null
      try {
        const trackId =
          referendumInfo.type === "Ongoing"
            ? Number(referendumInfo.value.track)
            : Number((metadata as any)?.track) || 1
        const trackInfo =
          await typedApi.query.CommunityTracks.Tracks.getValue(trackId)
        if (trackInfo) {
          const tVal = trackInfo as any
          curves = {
            decisionPeriod: Number(tVal.decision_period),
            approval: extractCurve(
              tVal.min_approval,
              Number(tVal.decision_period),
            ),
            support: extractCurve(
              tVal.min_support,
              Number(tVal.decision_period),
            ),
          }
        }
      } catch (err) {
        console.error("[useBountyDetail] Track info failed", err)
      }

      let progress = 0,
        timeLeft = "Unknown"
      if (referendumInfo.type === "Ongoing") {
        if (decidingSinceBlock !== null) {
          const period = curves?.decisionPeriod || 0
          if (period > 0) {
            const elapsed = currentBlock - decidingSinceBlock
            progress = Math.min(Math.max((elapsed / period) * 100, 0), 100)
            const remaining = (period - elapsed) * 6
            if (remaining > 0) {
              const d = Math.floor(remaining / 86400),
                h = Math.floor((remaining % 86400) / 3600),
                m = Math.floor((remaining % 3600) / 60)
              timeLeft = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
            } else timeLeft = "Ended"
          }
        } else {
          timeLeft = "Preparing"
        }
      } else {
        timeLeft = "Ended"
        if (
          decidingSinceBlock !== null &&
          finalizedAtBlock !== null &&
          !isNaN(decidingSinceBlock) &&
          !isNaN(finalizedAtBlock)
        ) {
          const period = curves?.decisionPeriod || 0
          if (period > 0) {
            const elapsed = finalizedAtBlock - decidingSinceBlock
            progress = Math.min(Math.max((elapsed / period) * 100, 0), 100)
          } else {
            progress = 100
          }
        } else {
          progress = 100
        }
      }

      let totalMembers = 1
      try {
        const communityId =
          (metadata as any)?.communityId !== undefined
            ? Number((metadata as any).communityId)
            : 1
        const allMembers =
          await typedApi.query.CommunityMemberships.Item.getEntries(communityId)
        totalMembers = Math.max(1, allMembers.length)
      } catch (err) {
        console.warn(
          "[useBountyDetail] Failed to fetch total community members",
          err,
        )
      }

      const finalData = toBountyDetailData(
        id,
        status,
        infoValue,
        metadata,
        tally,
        { ayes: countAyes, nays: countNays },
        recentVoters,
        curves,
        {
          current: currentBlock,
          submitted: submittedBlock,
          finalized: finalizedAtBlock,
        },
        progress,
        timeLeft,
        totalMembers,
      )

      setBountyData(finalData)
    } catch (err) {
      console.error("[useBountyDetail] Main fetch lifecycle error:", err)
    } finally {
      setSyncing(false)
    }
  }, [id])

  const handleVote = async (type: "for" | "against" | "abstain") => {
    if (!sdk || !userAddress || !id) return alert("Missing context")
    if (membershipId === null) return alert("No membership")

    setIsVoting(true)
    try {
      const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
      if (!client) throw new Error("Client missing")
      const typedApi = client.getTypedApi(kreivo)

      const tx = typedApi.tx.Communities.vote({
        membership_id: membershipId,
        poll_index: Number(id),
        vote: { type: "Standard", value: type === "for" } as any,
      })

      const encoded = (await tx.getEncodedData()).asHex()
      const inclusion = new Promise<void>((res, rej) => {
        sdk.onTransactionUpdate((e: any) => {
          if (e.type === "included" || e.type === "finalized") res()
          if (e.type === "failed")
            rej(e.transaction?.error || "Transaction failed")
        })
      })

      await sdk.custom.submitCallAsync(sdk.auth.sessionSigner, {
        callDataHex: encoded,
      })
      await inclusion
      setTimeout(() => fetchData(), 1500)
    } catch (e) {
      console.error("[useBountyDetail] Vote cast error:", e)
      alert("Vote failed")
    } finally {
      setIsVoting(false)
    }
  }

  const handlePlaceDecisionDeposit = async () => {
    if (!sdk || !userAddress || !id) return
    setIsDepositing(true)
    try {
      const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
      if (!client) return
      const tx = client
        .getTypedApi(kreivo)
        .tx.CommunityReferenda.place_decision_deposit({ index: Number(id) })
      const encoded = (await tx.getEncodedData()).asHex()

      const inclusion = new Promise<void>((res, rej) => {
        sdk.onTransactionUpdate((e: any) => {
          if (e.type === "included" || e.type === "finalized") res()
          if (e.type === "failed") rej("Failed")
        })
      })

      await sdk.custom.submitCallAsync(sdk.auth.sessionSigner, {
        callDataHex: encoded,
      })
      await inclusion
      setTimeout(() => fetchData(), 2000)
    } catch (e) {
      console.error("[useBountyDetail] Deposit placement error:", e)
    } finally {
      setIsDepositing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])
  useEffect(() => {
    fetchMembership()
  }, [fetchMembership])

  return {
    bountyData,
    syncing,
    isVoting,
    isDepositing,
    handleVote,
    handlePlaceDecisionDeposit,
  }
}
