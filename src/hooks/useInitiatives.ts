import { useEffect, useState } from "react"
import { chainClient$ } from "@/state/chains/chain.state"
import { firstValueFrom } from "rxjs"
import { take } from "rxjs/operators"

export interface Initiative {
  id: number
  name: string
  progress: number // 0-100 percentage
  status: "active" | "completed" | "pending"
  ayes?: number
  nays?: number
}

const LOG_PREFIX = "[useInitiatives]"
const LOG_ENABLED =
  localStorage.getItem("initiatives-logs") === "true" || import.meta.env.DEV

const log = {
  debug: (...args: any[]) => {
    if (LOG_ENABLED) {
      console.debug(LOG_PREFIX, ...args)
    }
  },
  info: (...args: any[]) => {
    if (LOG_ENABLED) {
      console.info(LOG_PREFIX, ...args)
    }
  },
  warn: (...args: any[]) => {
    console.warn(LOG_PREFIX, ...args)
  },
  error: (...args: any[]) => {
    console.error(LOG_PREFIX, ...args)
  },
}

if (import.meta.env.DEV) {
  ;(window as any).enableInitiativesLogs = () =>
    localStorage.setItem("initiatives-logs", "true")
  ;(window as any).disableInitiativesLogs = () =>
    localStorage.removeItem("initiatives-logs")
}

export const useInitiatives = (communityId: number = 1, limit?: number) => {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let subscription: any = null

    const fetchInitiatives = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const { client } = await firstValueFrom(chainClient$.pipe(take(1)))

        if (!client) {
          setError("Chain client not available")
          setIsLoading(false)
          return
        }

        const api = client.getUnsafeApi()

        try {
          log.info(`Fetching initiatives for community ${communityId}...`)

          const trackQueueResult = await (
            api.query as any
          ).CommunityReferenda?.TrackQueue?.getValue(communityId).catch(
            (err: any) => {
              log.error("Error querying TrackQueue:", err)
              return null
            },
          )

          log.debug(
            `trackQueue result for community ${communityId}:`,
            trackQueueResult,
          )

          if (!trackQueueResult) {
            log.warn(`No trackQueue result for community ${communityId}`)
            setInitiatives([])
            setIsLoading(false)
            return
          }

          let trackInfos: Array<{ id: number; count: number }> = []

          if (Array.isArray(trackQueueResult)) {
            trackInfos = trackQueueResult.map((item: any) => ({
              id: Number(item.id || item.referendumId || 0),
              count: Number(item.count || 0),
            }))
          } else if (typeof trackQueueResult === "object") {
            const values = Object.values(trackQueueResult)
            const arrayValue = values.find((v) => Array.isArray(v)) as
              | any[]
              | undefined
            if (arrayValue) {
              trackInfos = arrayValue.map((item: any) => ({
                id: Number(item.id || item.referendumId || 0),
                count: Number(item.count || 0),
              }))
            }
          }

          log.info(
            `Found ${trackInfos.length} initiatives in trackQueue:`,
            trackInfos,
          )

          if (trackInfos.length === 0) {
            setInitiatives([])
            setIsLoading(false)
            return
          }

          const initiativesList: Initiative[] = []

          const sortedTrackInfos = [...trackInfos].sort((a, b) => b.id - a.id)

          const trackInfosToProcess = limit
            ? sortedTrackInfos.slice(0, limit)
            : sortedTrackInfos

          log.info(`Processing ${trackInfosToProcess.length} initiatives...`)

          for (const trackInfo of trackInfosToProcess) {
            try {
              log.debug(`Fetching details for referendum ${trackInfo.id}...`)

              const referendumInfo = await (
                api.query as any
              ).CommunityReferenda?.ReferendumInfoFor?.getValue(
                trackInfo.id,
              ).catch(() => null)

              if (referendumInfo) {
                log.debug(`Referendum ${trackInfo.id} info:`, referendumInfo)

                const ongoing =
                  referendumInfo.Ongoing ||
                  referendumInfo.ongoing ||
                  referendumInfo

                const tally = ongoing.tally || {}
                const ayes = Number(tally.ayes || 0)
                const nays = Number(tally.nays || 0)
                const total = ayes + nays

                let progress = 0
                if (total > 0) {
                  progress = Math.round((ayes / total) * 100)
                }

                let status: "active" | "completed" | "pending" = "active"
                if (ongoing.deciding) {
                  status = "active"
                } else if (progress >= 100) {
                  status = "completed"
                } else {
                  status = "pending"
                }

                let name = `Initiative #${trackInfo.id}`

                try {
                  const metadata = await (
                    api.query as any
                  ).CommunityReferenda?.MetadataOf?.getValue(
                    trackInfo.id,
                  ).catch(() => null)
                  if (metadata) {
                    if (
                      Array.isArray(metadata) ||
                      metadata instanceof Uint8Array
                    ) {
                      const bytes = Array.from(metadata)
                      const filteredBytes = bytes.filter((b: number) => b !== 0)
                      if (filteredBytes.length > 0) {
                        const decodedName = String.fromCharCode(
                          ...filteredBytes,
                        )
                        if (decodedName.trim()) {
                          name = decodedName.trim()
                        }
                      }
                    }
                  }
                } catch (metadataErr) {
                  log.debug(
                    `Could not get metadata for referendum ${trackInfo.id}:`,
                    metadataErr,
                  )
                }

                initiativesList.push({
                  id: trackInfo.id,
                  name: name,
                  progress: progress,
                  status: status,
                  ayes: ayes,
                  nays: nays,
                })

                log.debug(
                  `Initiative ${trackInfo.id}: name="${name}", progress=${progress}%, ayes=${ayes}, nays=${nays}`,
                )
              } else {
                log.warn(
                  `Could not get details for referendum ${trackInfo.id}, using basic info`,
                )
                initiativesList.push({
                  id: trackInfo.id,
                  name: `Initiative #${trackInfo.id}`,
                  progress: 0,
                  status: "pending",
                  ayes: 0,
                  nays: 0,
                })
              }
            } catch (err) {
              log.error(
                `Error fetching details for referendum ${trackInfo.id}:`,
                err,
              )
              const alreadyPushed = initiativesList.some(
                (i) => i.id === trackInfo.id,
              )
              if (!alreadyPushed) {
                initiativesList.push({
                  id: trackInfo.id,
                  name: `Initiative #${trackInfo.id}`,
                  progress: 0,
                  status: "pending",
                })
              }
            }
          }

          log.info(
            `Successfully fetched ${initiativesList.length} initiatives:`,
            initiativesList.map((i) => ({
              id: i.id,
              name: i.name,
              progress: i.progress,
            })),
          )

          // De-duplicate initiatives by ID, keeping the first occurrence
          const uniqueInitiatives = Array.from(
            new Map(initiativesList.map((item) => [item.id, item])).values(),
          )

          setInitiatives(uniqueInitiatives)
          setIsLoading(false)
        } catch (storageErr: any) {
          log.error("Storage query error:", storageErr)
          setError("Could not query initiatives storage")
          setInitiatives([])
          setIsLoading(false)
        }
      } catch (err: any) {
        log.error("Error fetching initiatives:", err)
        setError(err.message || "Failed to fetch initiatives")
        setIsLoading(false)
      }
    }

    subscription = chainClient$.subscribe({
      next: () => {
        log.debug("Chain client connected, fetching initiatives...")
        fetchInitiatives()
      },
      error: (err) => {
        log.error("Chain client error:", err)
        setError("Chain client error")
        setIsLoading(false)
      },
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [communityId, limit])

  return { initiatives, isLoading, error }
}
