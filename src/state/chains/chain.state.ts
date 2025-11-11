import { get, update } from "idb-keyval"
import { getDynamicBuilder, getLookupFn } from "@polkadot-api/metadata-builders"
import { getObservableClient } from "@polkadot-api/observable-client"
import {
  decAnyMetadata,
  HexString,
  unifyMetadata,
} from "@polkadot-api/substrate-bindings"
import { createClient as createSubstrateClient } from "@polkadot-api/substrate-client"
import { fromHex, toHex } from "@polkadot-api/utils"
import { sinkSuspense, state, SUSPENSE } from "@react-rxjs/core"
import { createClient } from "polkadot-api"
import {
  concat,
  EMPTY,
  filter,
  finalize,
  firstValueFrom,
  from,
  map,
  NEVER,
  of,
  startWith,
  switchMap,
} from "rxjs"
import { getWebsocketProvider } from "./websocket"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import { getExtrinsicDecoder } from "@polkadot-api/tx-utils"
import { kreivo } from "@polkadot-api/descriptors"

const HARDCODED_ENDPOINT = "wss://testnet.kreivo.kippu.rocks"

const setRpcLogsEnabled = (enabled: boolean) =>
  localStorage.setItem("rpc-logs", String(enabled))
const getRpcLogsEnabled = () => localStorage.getItem("rpc-logs") === "true"
console.log("You can enable JSON-RPC logs by calling `setRpcLogsEnabled(true)`")
;(window as any).setRpcLogsEnabled = setRpcLogsEnabled

export const getProvider = () => {
  const source = { type: "websocket" as const, id: "localhost", endpoint: HARDCODED_ENDPOINT }
  const provider = getWebsocketProvider(source)

  return withLogsRecorder((msg) => {
    if (import.meta.env.DEV || getRpcLogsEnabled()) {
      console.debug(msg)
    }
  }, provider)
}

type MetadataCache = Map<string, { id: string; time: number; data: HexString }>
const IDB_KEY = "metadata-cache"
const MAX_CACHE_ENTRIES = 3

const addEntryToCache = (
  codeHash: string,
  entry: { id: string; time: number; data: HexString },
) =>
  update<MetadataCache>(IDB_KEY, (cached) => {
    cached ??= new Map()
    const old = [...cached.entries()].find(([, v]) => v.id === entry.id)
    if (old) cached.delete(old[0])
    cached.set(codeHash, entry)
    ;[...cached.entries()]
      .sort(([, a], [, b]) => b.time - a.time)
      .slice(MAX_CACHE_ENTRIES)
      .forEach(([k]) => {
        cached.delete(k)
      })
    return cached
  })

const getMetadata = (codeHash: string | null) =>
  codeHash
    ? from(get<MetadataCache>(IDB_KEY)).pipe(
        map((cache) => {
          const entry = cache?.get(codeHash)
          if (!entry) return null
          addEntryToCache(codeHash, { ...entry, time: Date.now() })
          return fromHex(entry.data)
        }),
      )
    : of(null)

const setMetadataFactory = (id: string) => (codeHash: string | null, data: Uint8Array) => {
  if (codeHash)
    addEntryToCache(codeHash, { id, time: Date.now(), data: toHex(data) })
}

export const chainClient$ = state(
  of("localhost").pipe(
    map((id) => [id, getProvider()] as const),
    switchMap(([id, provider], i) => {
      const setMetadata = setMetadataFactory(id)
      const substrateClient = createSubstrateClient(provider)
      const observableClient = getObservableClient(substrateClient, {
        getMetadata,
        setMetadata,
      })
      const chainHead = observableClient.chainHead$(2)
      const client = createClient(provider, {
        getMetadata: (id) => firstValueFrom(getMetadata(id)),
        setMetadata,
      })
      return concat(
        i === 0 ? EMPTY : of(SUSPENSE),
        of({ id, client, substrateClient, observableClient, chainHead }),
        NEVER,
      ).pipe(
        finalize(() => {
          chainHead.unfollow()
          client.destroy()
          observableClient.destroy()
        }),
      )
    }),
    sinkSuspense(),
  ),
)

export const client$ = state(chainClient$.pipe(map(({ client }) => client)))

export const unsafeApi$ = chainClient$.pipeState(
  map(({ client }) => client.getUnsafeApi()),
)

const uncachedRuntimeCtx$ = chainClient$.pipeState(
  switchMap(({ chainHead }) => chainHead.runtime$),
  filter((v) => !!v),
)

export const localRuntimeCtx$ = state(
  from(kreivo.getMetadata()).pipe(
    map((metadataRaw) => {
      if (!metadataRaw) throw new Error('Could not load local metadata')
      
      const metadata = unifyMetadata(decAnyMetadata(metadataRaw))
      const lookup = getLookupFn(metadata)
      const dynamicBuilder = getDynamicBuilder(lookup)

      return {
        metadataRaw,
        lookup,
        dynamicBuilder,
        txDecoder: getExtrinsicDecoder(metadataRaw),
      }
    })
  )
)

export const runtimeCtx$ = chainClient$.pipeState(
  switchMap(({ id }) =>
    get<MetadataCache>(IDB_KEY).then((cache) =>
      cache ? [...cache.entries()].find(([, v]) => v.id === id) : undefined,
    ),
  ),
  switchMap((cached) => {
    if (cached) {
      const metadata = unifyMetadata(decAnyMetadata(cached[1].data))
      const lookup = getLookupFn(metadata)
      const dynamicBuilder = getDynamicBuilder(lookup)

      return uncachedRuntimeCtx$.pipe(
        startWith({
          metadataRaw: fromHex(cached[1].data),
          lookup,
          dynamicBuilder,
        }),
      )
    }
    return uncachedRuntimeCtx$
  }),
  map((ctx) => ({
    ...ctx,
    txDecoder: getExtrinsicDecoder(ctx.metadataRaw),
  })),
)

export const lookup$ = localRuntimeCtx$.pipeState(map((ctx) => ctx.lookup))
export const metadata$ = lookup$.pipeState(map((lookup) => lookup.metadata))
export const dynamicBuilder$ = localRuntimeCtx$.pipeState(
  map((ctx) => ctx.dynamicBuilder),
)
