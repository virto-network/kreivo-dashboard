import { PolkadotClient } from "polkadot-api"
/**
 * Formats a long substrate address into a shortened version.
 */
export const formatAddress = (addr: string): string => {
  if (!addr || addr.length <= 10) return addr
  return `${addr.slice(0, 5)}...${addr.slice(-5)}`
}
/**
 * Decodes a hex string, Uint8Array, or FixedSizeBinary into a UTF-8 string,
 * removing trailing null bytes.
 */
export const decodeStorageString = (data: any): string => {
  if (!data) return ""
  try {
    if (typeof data.asText === "function") {
      const text = data.asText()
      if (typeof text === "string") return text.replace(/\0/g, "").trim()
    }

    let bytes: number[] | Uint8Array = []
    if (typeof data.asBytes === "function") {
      bytes = data.asBytes()
    } else if (data instanceof Uint8Array || Array.isArray(data)) {
      bytes = data
    } else if (typeof data === "string") {
      return data.replace(/\0/g, "").trim()
    }

    const filtered = Array.from(bytes).filter((b: number) => b !== 0)
    return String.fromCharCode(...filtered).trim()
  } catch (e) {
    console.warn("[SubstrateUtils] Failed to decode string:", e)
    return ""
  }
}

/**
 * Fetches a block hash for a given block number.
 */
export const getBlockHash = async (
  client: PolkadotClient,
  blockNumber: number,
): Promise<string | null> => {
  try {
    // We use the unsafe API for specific block hash requests by number
    const hash = (await client
      .getUnsafeApi()
      .query.System.BlockHash.getValue(blockNumber)) as string
    return hash || null
  } catch (e) {
    console.error(
      `[SubstrateUtils] Failed to get block hash for ${blockNumber}:`,
      e,
    )
    return null
  }
}
