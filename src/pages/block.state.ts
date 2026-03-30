import { client$ } from "@/state/chains/chain.state"
import { SystemEvent } from "@polkadot-api/observable-client"
import { state } from "@react-rxjs/core"
import { combineKeys, partitionByKey } from "@react-rxjs/utils"
import { FixedSizeBinary, HexString, PolkadotClient } from "polkadot-api"
import { getDynamicBuilder, getLookupFn } from "@polkadot-api/metadata-builders"
import { decAnyMetadata, unifyMetadata } from "@polkadot-api/substrate-bindings"
import { getExtrinsicDecoder } from "@polkadot-api/tx-utils"
import { toHex, fromHex } from "@polkadot-api/utils"
import {
  catchError,
  combineLatest,
  concat,
  defer,
  EMPTY,
  filter,
  forkJoin,
  from,
  map,
  merge,
  mergeMap,
  NEVER,
  Observable,
  of,
  repeat,
  scan,
  skip,
  startWith,
  Subject,
  switchMap,
  take,
  takeUntil,
  takeWhile,
  tap,
  timer,
  withLatestFrom,
} from "rxjs"
import { BlockInfo as RawBlockInfo } from "polkadot-api"

export const finalized$ = client$.pipeState(
  switchMap((client) => client.finalizedBlock$),
)

export enum BlockState {
  Fork = "fork",
  Best = "best",
  Finalized = "finalized",
  Pruned = "pruned",
  Unknown = "unknown",
}
export interface BlockInfo {
  hash: string
  parent: string
  number: number
  body: string[] | null
  decodedBody: any[] | null
  events: SystemEvent[] | null
  header: {
    parentHash: HexString
    number: number
    stateRoot: HexString
    extrinsicRoot: HexString
    digests: unknown[]
  } | null
  status: BlockState
  diff: Record<string, [string | null, string | null]> | null
}

const finalizedBlocks$ = state(
  client$.pipe(
    switchMap((client) => {
      const data = new Map<string, number>()
      return client.finalizedBlock$.pipe(
        scan((acc, current: { hash: string; number: number }) => {
          acc.set(current.hash, current.number)
          return acc
        }, data),
        startWith(data),
      )
    }),
  ),
)
finalizedBlocks$.subscribe()

export const [blockInfo$, recordedBlocks$] = partitionByKey(
  client$.pipe(switchMap((client) => client.blocks$)),
  (v) => v.hash,
  (block$) =>
    block$.pipe(
      take(1),
      withLatestFrom(client$),
      switchMap(
        ([{ hash, parent, number }, client]): Observable<BlockInfo> =>
          concat(
            combineLatest({
              hash: of(hash),
              parent: of(parent),
              number: of(number),
              body: client.watchBlockBody(hash).pipe(
                startWith(null),
                catchError((err) => {
                  console.error("fetch body failed", err)
                  return of(null)
                }),
              ),
              events: of(null), // Lazy: don't fetch on every block
              header: from(client.getBlockHeader(hash)).pipe(
                startWith(null),
                catchError((err) => {
                  console.error("fetch header failed", err)
                  return of(null)
                }),
              ),
              status: getBlockStatus$(client, hash, number, parent),
              diff: getBlockDiff$(parent, hash),
            }).pipe(
              map(
                (data) =>
                  ({
                    ...data,
                    decodedBody: null,
                  }) as unknown as BlockInfo,
              ),
            ),
            NEVER,
          ),
      ),
      takeUntil(merge(client$.pipe(skip(1)), timer(60 * 60 * 1000))),
    ),
)

const getUnpinnedBlockInfo$ = (hash: string): Observable<BlockInfo> =>
  client$.pipe(
    switchMap((client) =>
      combineLatest({
        headerAndStatus: from(client.getBlockHeader(hash)).pipe(
          mergeMap((header) =>
            getBlockStatus$(
              client,
              hash,
              header.number,
              header.parentHash,
            ).pipe(
              map((status) => ({
                header,
                status,
              })),
            ),
          ),
        ),
        body: client.watchBlockBody(hash),
        events: client.getUnsafeApi().query.System.Events.getValue({
          at: hash,
        }),
      }).pipe(
        map(({ headerAndStatus: { header, status }, body, events }) => ({
          hash: hash,
          parent: header.parentHash,
          number: header.number,
          body,
          decodedBody: null, // Will be hydrated below if needed
          events,
          header,
          status,
          diff: null,
        })),
        mergeMap(async (block: any) => {
          try {
            const metadataRaw = await client.getMetadata(hash)
            const metadata =
              metadataRaw instanceof Uint8Array
                ? toHex(metadataRaw)
                : (metadataRaw as HexString)
            block.decodedBody = await decodeExtrinsics(
              metadata,
              block.body || [],
            )
          } catch (e) {
            console.warn("Failed to decode body for unpinned block", e)
          }
          return block as BlockInfo
        }),
        catchError(() => getUnpinnedBlockInfoFallback$(hash, client)),
        tap((v) => disconnectedBlocks$.next(v)),
      ),
    ),
  )

const getUnpinnedBlockInfoFallback$ = (
  hash: string,
  client: PolkadotClient,
): Observable<BlockInfo> => {
  const throughRpc$ = defer(() =>
    client._request<
      {
        block: {
          extrinsics: HexString[]
          header: {
            digest: { logs: Array<unknown> }
            extrinsicsRoot: string
            number: HexString
            parentHash: HexString
            stateRoot: HexString
          }
        }
      } | null,
      [string]
    >("chain_getBlock", [hash]),
  ).pipe(
    repeat({
      delay: 1000,
    }),
    filter((v) => !!v),
    take(1),
    catchError(() => EMPTY),
    mergeMap((res) => {
      const header = res.block.header
      const number = Number(header.number)
      return getBlockStatus$(client, hash, number, header.parentHash).pipe(
        map((status) => ({
          ...res,
          number,
          status,
        })),
      )
    }),
  )

  return throughRpc$.pipe(
    mergeMap(async (res) => {
      const {
        block: { extrinsics, header },
        status,
        number,
      } = res
      let events: any[] | null = null
      let decodedBody: any[] | null = null

      try {
        const metadataRaw = await client.getMetadata(hash)
        const chainMetadata = unifyMetadata(decAnyMetadata(metadataRaw))
        const dynamicBuilder = getDynamicBuilder(getLookupFn(chainMetadata))

        // 1. Fetch Events
        try {
          const eventsStorage = dynamicBuilder.buildStorage("System", "Events")
          const eventsKey = eventsStorage.keys.enc()
          const eventsHex = await client._request<
            string | null,
            [string, string]
          >("state_getStorage", [eventsKey, hash])
          if (eventsHex) {
            events = eventsStorage.value.dec(eventsHex)
          }
        } catch (e) {
          console.warn("Failed to fetch events in fallback", e)
        }

        // 2. Decode Extrinsics
        const metadata =
          metadataRaw instanceof Uint8Array
            ? toHex(metadataRaw)
            : (metadataRaw as HexString)
        decodedBody = await decodeExtrinsics(metadata, extrinsics)
      } catch (e) {
        console.warn("Metadata retrieval failed in fallback", e)
      }

      return {
        hash,
        parent: header.parentHash,
        body: extrinsics,
        decodedBody,
        events,
        header: {
          digests: header.digest.logs,
          extrinsicRoot: header.extrinsicsRoot,
          number,
          parentHash: header.parentHash,
          stateRoot: header.stateRoot,
        },
        number,
        status,
        diff: null,
      } as BlockInfo
    }),
  )
}

async function decodeExtrinsics(
  metadataRaw: string | Uint8Array,
  body: string[],
) {
  try {
    const metadata =
      typeof metadataRaw === "string" ? fromHex(metadataRaw) : metadataRaw
    const extrinsicDecoder = getExtrinsicDecoder(metadata)

    return body.map((hex) => {
      try {
        const decoded = extrinsicDecoder(hex) as any
        // Decoded structure in PAPI: { call: { type: 'PalletName', value: { type: 'CallName', value: { ...args } } } }
        return {
          hash: "",
          pallet: decoded.call?.type || "Unknown",
          call: decoded.call?.value?.type || "Unknown",
          args: decoded.call?.value?.value || {},
        }
      } catch (e) {
        return { pallet: "Unknown", call: "Unknown", args: {}, hex }
      }
    })
  } catch (e) {
    console.error("decodeExtrinsics failed", e)
    return body.map((hex) => ({
      pallet: "Raw",
      call: "DecryptionFailed",
      args: {},
      hex,
    }))
  }
}

export const inMemoryBlocks$ = state(
  combineKeys(recordedBlocks$, (key) =>
    blockInfo$(key).pipe(startWith(null)),
  ).pipe(repeat()),
)
inMemoryBlocks$.subscribe()

const blockHash$ = (hashOrHeight: string) =>
  hashOrHeight.length > 63
    ? of(hashOrHeight.startsWith("0x") ? hashOrHeight : `0x${hashOrHeight}`)
    : client$.pipe(
        switchMap((client) =>
          from(
            client._request<HexString[], [number]>("archive_v1_hashByHeight", [
              Number(hashOrHeight),
            ]),
          ).pipe(
            map((x) => {
              if (x.length) return x[0]
              throw null
            }),
            catchError(() =>
              client
                .getUnsafeApi()
                .query.System.BlockHash.getValue(Number(hashOrHeight))
                .then((x: FixedSizeBinary<32>) => x.asHex()),
            ),
          ),
        ),
      )

// Hydrate a block with full info (metadata, decoded body, events)
export const hydratedBlockInfo$ = (hash: string) =>
  combineLatest([blockInfo$(hash), client$]).pipe(
    switchMap(([baseInfo, client]) => {
      if (!baseInfo) return of(null)

      return combineLatest({
        metadata: from(client.getMetadata(hash)).pipe(
          catchError(() => of(null)),
        ),
        events: from(
          client.getUnsafeApi().query.System.Events.getValue({ at: hash }),
        ).pipe(catchError(() => of(null))),
      }).pipe(
        mergeMap(async ({ metadata: metadataRaw, events }) => {
          let decodedBody = null
          if (metadataRaw && baseInfo.body) {
            const metadata =
              metadataRaw instanceof Uint8Array
                ? toHex(metadataRaw)
                : (metadataRaw as HexString)
            decodedBody = await decodeExtrinsics(metadata, baseInfo.body)
          }
          return {
            ...baseInfo,
            events,
            decodedBody,
          } as BlockInfo
        }),
      )
    }),
  )

export const blockInfoState$ = state(
  (hashOrHeight: string) =>
    inMemoryBlocks$.pipe(
      take(1),
      switchMap((blocks) => {
        if (blocks.has(hashOrHeight)) return hydratedBlockInfo$(hashOrHeight)
        const potentialHeight = Number(hashOrHeight)
        const target = Array.from(blocks.values()).find(
          (x) => x?.number === potentialHeight,
        )
        if (target) return hydratedBlockInfo$(target.hash)
        return blockHash$(hashOrHeight).pipe(mergeMap(getUnpinnedBlockInfo$))
      }),
    ),
  null,
)

const disconnectedBlocks$ = new Subject<BlockInfo>()
export const blocksByHeight$ = state(
  merge(
    recordedBlocks$.pipe(
      mergeMap((change) => {
        if (change.type === "remove") {
          return of({
            type: "remove" as const,
            keys: change.keys,
          })
        }
        const targets$ = forkJoin(
          [...change.keys].map((hash) => blockInfo$(hash).pipe(take(1))),
        )

        return targets$.pipe(
          map((targets) => ({
            type: "add" as const,
            targets,
          })),
        )
      }),
    ),
    disconnectedBlocks$.pipe(
      map((block) => ({
        type: "add" as const,
        targets: [block],
      })),
    ),
  ).pipe(
    scan(
      (acc, evt) => {
        if (evt.type === "remove") {
          for (const hash of evt.keys) {
            const height = acc.heightOfBlock[hash]
            acc.blocksByHeight[height]?.delete(hash)
            if (!acc.blocksByHeight[height]?.size) {
              delete acc.blocksByHeight[height]
            }
            delete acc.heightOfBlock[hash]
          }
        } else {
          for (const block of evt.targets) {
            acc.heightOfBlock[block.hash] = block.number
            acc.blocksByHeight[block.number] =
              acc.blocksByHeight[block.number] ?? new Map()
            acc.blocksByHeight[block.number].set(block.hash, block)
          }
        }

        return acc
      },
      {
        blocksByHeight: {} as Record<number, Map<string, BlockInfo>>,
        heightOfBlock: {} as Record<string, number>,
      },
    ),
    map((v) => v.blocksByHeight),
  ),
)

const getBlockStatus = (
  best: Array<RawBlockInfo>,
  finBlocks: Map<string, number>,
  number: number,
  hash: string,
) => {
  const finalized = best[best.length - 1]
  if (finalized.number === number)
    return finalized.hash === hash ? BlockState.Finalized : BlockState.Pruned

  return finalized.number < number
    ? best.some((b) => b.hash === hash)
      ? BlockState.Best
      : BlockState.Fork
    : finBlocks.has(hash)
      ? BlockState.Finalized
      : BlockState.Unknown
}

const getBlockStatus$ = (
  client: PolkadotClient,
  hash: string,
  number: number,
  parent: string,
): Observable<BlockState> =>
  client.bestBlocks$.pipe(
    withLatestFrom(finalizedBlocks$),
    map(([best, finBlocks]) => {
      const status = getBlockStatus(best, finBlocks, number, hash)
      if (status === BlockState.Finalized && !finBlocks.has(parent))
        finBlocks.set(parent, number - 1)
      return status
    }),
    takeWhile(
      (v) => v !== BlockState.Finalized && v !== BlockState.Pruned,
      true,
    ),
  )

const getBlockDiff$ = (
  _parent: string,
  _hash: string,
): Observable<Record<string, [string | null, string | null]> | null> => of(null)
