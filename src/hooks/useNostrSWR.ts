import { useState, useEffect, useRef } from "react"
import { SimplePool, Filter, EventTemplate } from "nostr-tools"

// A global pool to avoid creating too many concurrent websocket connections
const globalPool = new SimplePool()

// Default relays defined outside to maintain stable reference
const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
]

interface UseNostrSWRProps<T> {
  queryKey: string
  fetchRealData: () => Promise<T>
  relays?: string[]
  kind?: number
  ttlSeconds?: number
  // Function to sign an event and upload it to nostr if this user contributes to the cache.
  // If not provided, the user only reads the cache.
  signEventFn?: (template: EventTemplate) => Promise<any>
}

export function useNostrSWR<T>({
  queryKey,
  fetchRealData,
  relays = DEFAULT_RELAYS,
  kind = 30000,
  ttlSeconds = 600, // 10 minutes cache
  signEventFn,
}: UseNostrSWRProps<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCached, setIsCached] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Use reference to avoid race conditions if queryKey changes fast
  const currentKey = useRef(queryKey)
  const fetchRealDataRef = useRef(fetchRealData)
  const signEventFnRef = useRef(signEventFn)

  // Synchronize latest callbacks
  useEffect(() => {
    fetchRealDataRef.current = fetchRealData
    signEventFnRef.current = signEventFn
  }, [fetchRealData, signEventFn])

  // Convert the relays array to a string for the useEffect dependency
  // This avoids infinite loops if the user passes ["wss://.."] directly inline
  const relaysKey = relays.join(",")

  useEffect(() => {
    currentKey.current = queryKey
    let mounted = true
    setIsLoading(true)
    setError(null)
    setIsCached(false)

    const loadData = async () => {
      let nostrCacheHit = false

      // 1. Optimistic Phase: Try to read from Nostr cache
      try {
        const filter: Filter = {
          kinds: [kind],
          "#d": [queryKey],
          limit: 1, // We want only the most recent event
        }

        // Query the pool of connected relays
        // In nostr-tools >= 2.x this is available.
        // Or subscribeMany can be used to listen for EOSE.
        const events = await new Promise<any[]>((resolve) => {
          const eventsAcc: any[] = []
          const sub = globalPool.subscribeMany(relays, [filter] as any, {
            onevent(e: any) {
              eventsAcc.push(e)
            },
            oneose() {
              sub.close()
              resolve(eventsAcc)
            },
          })

          // 2-second security timeout to not freeze the UI if connection fails
          setTimeout(() => {
            sub.close()
            resolve(eventsAcc)
          }, 2000)
        })

        if (mounted && events.length > 0 && currentKey.current === queryKey) {
          // Sort by most recent
          const latestEvent = events.sort(
            (a, b) => b.created_at - a.created_at,
          )[0]

          // Check Expiration (NIP-40)
          const expirationTag = latestEvent.tags.find(
            (t: any) => t[0] === "expiration",
          )
          const isExpired =
            expirationTag &&
            Number(expirationTag[1]) < Math.floor(Date.now() / 1000)

          if (!isExpired) {
            try {
              const parsedData = JSON.parse(latestEvent.content) as T
              setData(parsedData)
              setIsCached(true)
              setIsLoading(false)
              nostrCacheHit = true
              console.debug(`[useNostrSWR] Cache hit for ${queryKey}`)
            } catch (err) {
              console.warn("[useNostrSWR] Error parsing Nostr JSON", err)
            }
          }
        }
      } catch (err) {
        console.warn("[useNostrSWR] Nostr cache query failed", err)
      }

      // 2. Revalidation Phase (The real background fetch)
      try {
        const freshData = await fetchRealDataRef.current()

        if (mounted && currentKey.current === queryKey) {
          // If there was no cache, or if data is different (optional: do deep compare), we update
          setData(freshData)
          setIsCached(false) // Data shown is now 100% fresh
          setIsLoading(false)

          // 3. Optional: Write fresh data to cache for everyone!
          // Only if we have the signing function (e.g. verifying user is a developer or a bot)
          const signFn = signEventFnRef.current
          if (signFn) {
            try {
              const eventTemplate: EventTemplate = {
                kind,
                created_at: Math.floor(Date.now() / 1000),
                tags: [
                  ["d", queryKey],
                  [
                    "expiration",
                    (Math.floor(Date.now() / 1000) + ttlSeconds).toString(),
                  ],
                  ["client", "kreivo-dashboard"],
                ],
                content: JSON.stringify(freshData),
              }
              const signedEvent = await signFn(eventTemplate)

              // Publish to relays in fire-and-forget mode
              Promise.any(globalPool.publish(relays, signedEvent)).catch(() => {
                // Ignore silent errors for publishing
              })
              console.debug(
                `[useNostrSWR] Cache updated and published for ${queryKey}`,
              )
            } catch (err) {
              console.warn("[useNostrSWR] Failed to sign or publish event", err)
            }
          }
        }
      } catch (err) {
        if (mounted && currentKey.current === queryKey) {
          console.error("[useNostrSWR] Error fetching real data:", err)
          setError(
            err instanceof Error ? err : new Error("Unknown fetch error"),
          )

          // If there was no cache data to show, we stop loading
          if (!nostrCacheHit) {
            setIsLoading(false)
          }
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [queryKey, kind, ttlSeconds, relaysKey]) // We depend on relaysKey (string) instead of relays (array) to avoid loops

  return { data, isLoading, isCached, error }
}
