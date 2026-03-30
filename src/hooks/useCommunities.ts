import { useCallback } from "react"
import { chainClient$ } from "@/state/chains/chain.state"
import { firstValueFrom } from "rxjs"
import { take } from "rxjs/operators"
import { useNostrSWR } from "./useNostrSWR"
import { finalizeEvent } from "nostr-tools"
import { NostrService } from "@/services/nostr"
import { kreivo } from "@polkadot-api/descriptors"
import { Community } from "@/types/governance"
import { decodeStorageString } from "@/utils/substrate"

export const useCommunities = (limit?: number) => {
  const fetchRealData = useCallback(async (): Promise<Community[]> => {
    try {
      const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
      if (!client) throw new Error("Chain client not available")

      const typedApi = client.getTypedApi(kreivo)

      console.info("[useCommunities] Fetching community IDs...")
      const tracksIdsResult =
        await typedApi.query.CommunityTracks.TracksIds.getValue()

      if (!tracksIdsResult) {
        console.warn("[useCommunities] No tracksIds result found")
        return []
      }

      let communityIds: number[] = []
      if (Array.isArray(tracksIdsResult)) {
        communityIds = tracksIdsResult.map((id) => Number(id))
      } else if (
        typeof tracksIdsResult === "object" &&
        "communities" in tracksIdsResult
      ) {
        // @ts-expect-error PAPI dynamic union/struct handling
        communityIds = (tracksIdsResult.communities as any[]).map((id) =>
          Number(id),
        )
      }

      console.info(
        `[useCommunities] Found ${communityIds.length} communities. Fetching details...`,
      )

      const communitiesList: Community[] = await Promise.all(
        communityIds.map(async (id) => {
          try {
            const [trackInfo, membersEntries] = await Promise.all([
              typedApi.query.CommunityTracks.Tracks.getValue(id),
              typedApi.query.CommunityMemberships.Item.getEntries(id),
            ])

            const name =
              decodeStorageString((trackInfo as any)?.name) || `Community ${id}`
            const members = membersEntries?.length || 0

            return { id, name, members }
          } catch (err) {
            console.error(
              `[useCommunities] Error fetching detail for community ${id}`,
              err,
            )
            return { id, name: `Community ${id}`, members: 0 }
          }
        }),
      )

      console.info(
        `[useCommunities] Successfully fetched ${communitiesList.length} communities`,
      )
      return communitiesList
    } catch (err) {
      console.error("[useCommunities] Fatal error fetching communities:", err)
      throw err
    }
  }, [])

  const signEventFn = useCallback(async (template: any) => {
    const sk = NostrService.getOrCreateSecretKey()
    return finalizeEvent(template, sk)
  }, [])

  const {
    data: communities,
    isLoading,
    isCached,
    error,
  } = useNostrSWR({
    queryKey: `kreivo:communities:all`,
    fetchRealData,
    signEventFn,
  })

  const results = limit
    ? (communities || []).slice(0, limit)
    : communities || []
  return {
    communities: results,
    isLoading,
    isCached,
    error: error?.message || null,
  }
}
