import { useState, useEffect, useCallback } from "react"
import { chainClient$ } from "@/state/chains/chain.state"
import { firstValueFrom } from "rxjs"
import { take } from "rxjs/operators"
import { kreivo } from "@polkadot-api/descriptors"
import { Initiative } from "@/types/governance"
import { toInitiative } from "@/adapters/governance.adapter"

/**
 * Hook to fetch and manage the list of initiatives (referendums) for a specific community.
 * Orchestrates the data flow between the blockchain and the UI.
 */
export const useInitiatives = (communityId: number = 1, limit?: number) => {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetches raw referendum data and transforms it via adapters.
   */
  const fetchRealData = useCallback(async (): Promise<Initiative[]> => {
    try {
      const { client } = await firstValueFrom(chainClient$.pipe(take(1)))
      if (!client) throw new Error("Chain client not available")

      const typedApi = client.getTypedApi(kreivo)

      console.info(
        `[useInitiatives] Fetching initiatives for community ${communityId}...`,
      )

      // Fetch all referendum storage entries
      const allReferendums =
        await typedApi.query.CommunityReferenda.ReferendumInfoFor.getEntries()

      if (!allReferendums || allReferendums.length === 0) {
        console.warn("[useInitiatives] No referendums found")
        return []
      }

      // Sort by ID descending (newest first)
      const sortedEntries = [...allReferendums].sort(
        (a, b) => Number(b.keyArgs[0]) - Number(a.keyArgs[0]),
      )
      const entriesToProcess = limit
        ? sortedEntries.slice(0, limit)
        : sortedEntries

      console.info(
        `[useInitiatives] Mapping ${entriesToProcess.length} referendums via adapters...`,
      )

      // Parallelize mapping of raw chain data to UI entities using the governance adapter
      const initiativesList = await Promise.all(
        entriesToProcess.map((entry) => {
          const refId = Number(entry.keyArgs[0])
          return toInitiative(refId, entry.value, typedApi, client)
        }),
      )

      console.info(
        `[useInitiatives] Successfully mapped ${initiativesList.length} initiatives`,
      )
      return initiativesList
    } catch (err) {
      console.error("[useInitiatives] Fatal error fetching initiatives:", err)
      throw err
    }
  }, [communityId, limit])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      try {
        const data = await fetchRealData()
        if (mounted) {
          setInitiatives(data)
          setError(null)
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to fetch initiatives")
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [fetchRealData])

  return { initiatives, isLoading, isCached: false, error }
}
