import { useState, useEffect, useRef } from "react"
import { SimplePool, Filter, EventTemplate } from "nostr-tools"

// Un pool global para evitar crear demasiadas conexiones websocket concurrentes
const globalPool = new SimplePool()

// Default relays definidos afuera para mantener referencia estable
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
  // Función para firmar un evento y subirlo a nostr si este usuario contribuye al caché.
  // Si no se provee, el usuario solo lee el caché.
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

  // Usar referencia para evitar race conditions si queryKey cambia rápido
  const currentKey = useRef(queryKey)
  const fetchRealDataRef = useRef(fetchRealData)
  const signEventFnRef = useRef(signEventFn)

  // Sincronizar callbacks más recientes
  useEffect(() => {
    fetchRealDataRef.current = fetchRealData
    signEventFnRef.current = signEventFn
  }, [fetchRealData, signEventFn])

  // Convertir el arreglo de relays a un string para la dependencia del useEffect
  // Esto evita loops infinitos si el usuario pasa ["wss://.."] directamente en línea
  const relaysKey = relays.join(",")

  useEffect(() => {
    currentKey.current = queryKey
    let mounted = true
    setIsLoading(true)
    setError(null)
    setIsCached(false)

    const loadData = async () => {
      let nostrOcurrioCacheHit = false

      // 1. Fase Optimista: Intentar leer del caché de Nostr
      try {
        const filter: Filter = {
          kinds: [kind],
          "#d": [queryKey],
          limit: 1, // Queremos solo el evento más reciente
        }

        // Consultar el pool de relays conectados
        // En nostr-tools >= 2.x esto está disponible.
        // O se puede usar subscribeMany para escuchar EOSE.
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

          // Timeout de seguridad de 2 segundos para no trabar el UI fallando en conectarse
          setTimeout(() => {
            sub.close()
            resolve(eventsAcc)
          }, 2000)
        })

        if (mounted && events.length > 0 && currentKey.current === queryKey) {
          // Ordenar por el más reciente
          const latestEvent = events.sort(
            (a, b) => b.created_at - a.created_at,
          )[0]

          // Revisar Expiración (NIP-40)
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
              nostrOcurrioCacheHit = true
              console.debug(`[useNostrSWR] Cache hit for ${queryKey}`)
            } catch (err) {
              console.warn("[useNostrSWR] Error parseando JSON de Nostr", err)
            }
          }
        }
      } catch (err) {
        console.warn("[useNostrSWR] Falló la consulta al caché de Nostr", err)
      }

      // 2. Fase de Revalidación (El "fetch" real en segundo plano)
      try {
        const freshData = await fetchRealDataRef.current()

        if (mounted && currentKey.current === queryKey) {
          // Si no hubo caché, o si la data es distinta (opcional: hacer deep compare), actualizamos
          setData(freshData)
          setIsCached(false) // Los datos mostrados ahora ya son 100% frescos
          setIsLoading(false)

          // 3. Opcional: Escribir los datos frescos en el caché parea todos!
          // Solo si tenemos la función de firma (por ejemplo que comprueba que el usuario es un developer o un bot)
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

              // Publicar a los relays en fire-and-forget
              Promise.any(globalPool.publish(relays, signedEvent)).catch(() => {
                // Ignore silent errors for publishing
              })
              console.debug(
                `[useNostrSWR] Caché actualizado y publicado para ${queryKey}`,
              )
            } catch (err) {
              console.warn(
                "[useNostrSWR] No se pudo firmar o publicar el evento",
                err,
              )
            }
          }
        }
      } catch (err) {
        if (mounted && currentKey.current === queryKey) {
          console.error("[useNostrSWR] Error fetching real data:", err)
          setError(
            err instanceof Error ? err : new Error("Unknown fetch error"),
          )

          // Si no había datos del caché para mostrar, cortamos el loading
          if (!nostrOcurrioCacheHit) {
            setIsLoading(false)
          }
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [queryKey, kind, ttlSeconds, relaysKey]) // Dependemos de relaysKey (string) en vez de relays (array) para evitar loops

  return { data, isLoading, isCached, error }
}
