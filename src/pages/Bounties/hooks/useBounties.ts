import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { createClient } from "polkadot-api"
import { createClient as createSubstrateClient } from "@polkadot-api/substrate-client"
import { getDynamicBuilder, getLookupFn } from "@polkadot-api/metadata-builders"
import { decAnyMetadata, unifyMetadata } from "@polkadot-api/substrate-bindings"
import { kreivo } from "@polkadot-api/descriptors"
import { getWsProvider } from "@polkadot-api/ws-provider/web"
import { NostrService } from "@/services/nostr"
import { Bounty } from "@/types/governance"
import { NostrProposalMetadata } from "@/types/nostr"
import {
  parseReferendumStatus,
  toBounty,
  toInitialBounty,
} from "../adapters/bounties.adapter"

export const useBounties = () => {
  const { communityId } = useParams<{ communityId: string }>()
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    const fetchBounties = async () => {
      try {
        // --- 0. Instant NOSTR Load ---
        let allNostrProposals: Record<string, NostrProposalMetadata> = {}
        try {
          allNostrProposals = await NostrService.getAllProposalsMetadata()
          const initialBounties: Bounty[] = []
          for (const [hash, meta] of Object.entries(allNostrProposals)) {
            const commIdMatch = communityId
              ? meta.communityId === Number(communityId)
              : true
            if (commIdMatch) {
              initialBounties.push(toInitialBounty(hash, meta))
            }
          }
          initialBounties.sort((a, b) => parseInt(b.id) - parseInt(a.id))
          setBounties(initialBounties)
        } catch (e) {
          console.warn("NOSTR instant load failed", e)
        }

        const wsProvider = getWsProvider("wss://kreivo.io")
        const substrateClient = createSubstrateClient(wsProvider)
        const client = createClient(wsProvider)
        const typedApi = client.getTypedApi(kreivo)
        const referendaEntries =
          await typedApi.query.CommunityReferenda.ReferendumInfoFor.getEntries()

        const metadataRaw = await kreivo.getMetadata()
        const chainMetadata = unifyMetadata(decAnyMetadata(metadataRaw))
        const dynamicBuilder = getDynamicBuilder(getLookupFn(chainMetadata))
        const storageBuilder = dynamicBuilder.buildStorage(
          "CommunityReferenda",
          "ReferendumInfoFor",
        )

        console.log(
          `[useBounties] Extracted ${referendaEntries.length} referenda entries`,
        )

        const fetchPromises = referendaEntries.map(
          async ({ keyArgs, value }) => {
            const [referendumId] = keyArgs
            const info = value

            const { status, tally, finishedAtBlock } =
              parseReferendumStatus(info)

            let referendumCommunityId: number | null = null
            let referendumSubmittedBlock: number | undefined

            if (info.type === "Ongoing") {
              const ongoingVal = info.value as any
              if (ongoingVal.track !== undefined && ongoingVal.track !== null) {
                referendumCommunityId = Number(ongoingVal.track)
              }
              if (ongoingVal.submitted !== undefined) {
                referendumSubmittedBlock = Number(ongoingVal.submitted)
              }
            } else if (finishedAtBlock) {
              try {
                const prevBlockNum = finishedAtBlock - 1
                const histBlockHashHex: string = await substrateClient.request(
                  "chain_getBlockHash",
                  [prevBlockNum],
                )
                console.log(
                  `[useBounties] #${referendumId} hash @${prevBlockNum}:`,
                  histBlockHashHex,
                )

                if (
                  histBlockHashHex &&
                  histBlockHashHex !==
                    "0x0000000000000000000000000000000000000000000000000000000000000000"
                ) {
                  const keyStr =
                    await typedApi.query.CommunityReferenda.ReferendumInfoFor.getKey(
                      referendumId,
                    )
                  const storageHex = await substrateClient.request(
                    "state_getStorage",
                    [keyStr, histBlockHashHex],
                  )

                  if (storageHex) {
                    const histRef = storageBuilder.value.dec(
                      storageHex as string,
                    ) as any
                    console.log(
                      `[useBounties] #${referendumId} historic state:`,
                      histRef?.type,
                    )
                    if (histRef && histRef.type === "Ongoing") {
                      const histVal = histRef.value as any
                      if (
                        histVal.track !== undefined &&
                        histVal.track !== null
                      ) {
                        referendumCommunityId = Number(histVal.track)
                        if (histVal.tally) {
                          tally.ayes = histVal.tally.ayes
                          tally.nays = histVal.tally.nays
                        }
                        if (histVal.submitted !== undefined)
                          referendumSubmittedBlock = Number(histVal.submitted)
                      }
                    }
                  }
                }
              } catch (trackErr) {
                console.warn(
                  `[useBounties] Could not fetch track for #${referendumId}:`,
                  trackErr,
                )
              }
            }

            if (communityId) {
              const communityIdNumber = parseInt(communityId, 10)
              if (
                referendumCommunityId !== null &&
                referendumCommunityId !== communityIdNumber
              ) {
                return null
              }
              if (referendumCommunityId === null) {
                let earlyMeta: any =
                  allNostrProposals[referendumId.toString()] || null
                if (!earlyMeta) {
                  try {
                    earlyMeta = await NostrService.getProposalMetadata(
                      referendumId.toString(),
                    )
                  } catch {
                    /* ok */
                  }
                }
                if (
                  earlyMeta?.communityId !== undefined &&
                  Number(earlyMeta.communityId) !== communityIdNumber
                ) {
                  return null
                }
              }
            }

            let metadata: any =
              allNostrProposals[referendumId.toString()] || null
            if (!metadata) {
              try {
                metadata = await NostrService.getProposalMetadata(
                  referendumId.toString(),
                )
              } catch {
                /* no metadata is fine */
              }
            }

            console.log(
              `[useBounties] Displaying Proposal #${referendumId} (community ${referendumCommunityId}) as ${status}`,
            )

            return toBounty(
              referendumId.toString(),
              status,
              tally,
              metadata,
              referendumSubmittedBlock,
              finishedAtBlock,
            )
          },
        )

        const fetchedBounties = (await Promise.all(fetchPromises)).filter(
          Boolean,
        ) as Bounty[]
        fetchedBounties.sort((a, b) => parseInt(b.id) - parseInt(a.id))
        setBounties(fetchedBounties)
      } catch (err) {
        console.error("Error fetching bounties:", err)
      } finally {
        setSyncing(false)
      }
    }

    fetchBounties()
  }, [communityId])

  return { bounties, syncing, communityId }
}
