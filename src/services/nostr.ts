import {
  generateSecretKey,
  getPublicKey,
  UnsignedEvent,
  finalizeEvent,
} from "nostr-tools"
import { SimplePool } from "nostr-tools/pool"
import { NostrProposalMetadata, NostrComment } from "@/types/nostr"

export class NostrService {
  private static STORAGE_KEY = "nostr_sk"
  private static RELAYS = [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net",
  ]
  private static pool = new SimplePool()

  static getOrCreateSecretKey(): Uint8Array {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (stored) {
      return this.hexToBytes(stored)
    }

    const sk = generateSecretKey()
    const hex = this.bytesToHex(sk)
    localStorage.setItem(this.STORAGE_KEY, hex)
    return sk
  }

  static getPublicKey(): string {
    const sk = this.getOrCreateSecretKey()
    return getPublicKey(sk)
  }

  static async publishProposalMetadata(
    title: string,
    description: string,
    proposalHash: string,
    extraData: Record<string, any>,
    relays: string[] = this.RELAYS,
  ): Promise<string> {
    const sk = this.getOrCreateSecretKey()

    const content = JSON.stringify({
      title,
      description,
      proposalHash,
      ...extraData,
      timestamp: Date.now(),
    })

    const eventTemplate: UnsignedEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["t", "kreivo"],
        ["t", "proposal"],
        ["proposal_hash", proposalHash],
        ["d", `proposal-${proposalHash}`],
      ],
      content: content,
      pubkey: getPublicKey(sk),
    }

    const signedEvent = finalizeEvent(eventTemplate, sk)

    try {
      console.log("Publishing to relays:", relays)
      await Promise.any(this.pool.publish(relays, signedEvent))
      console.log("Published to at least one relay", signedEvent.id)
      return signedEvent.id
    } catch (err) {
      console.error("Failed to publish to any relay", err)
      throw err
    }
  }

  static async getProposalMetadata(
    proposalHash: string,
    relays: string[] = this.RELAYS,
  ): Promise<NostrProposalMetadata | null> {
    try {
      const event = await this.pool.get(relays, {
        kinds: [1],
        "#proposal_hash": [proposalHash],
      })

      if (event) {
        try {
          return JSON.parse(event.content)
        } catch (_e) {
          console.error("Failed to parse Nostr event content", _e)
          return null
        }
      }
      return null
    } catch (err) {
      console.error("Error fetching from Nostr", err)
      return null
    }
  }

  static async getAllProposalsMetadata(
    relays: string[] = this.RELAYS,
  ): Promise<Record<string, NostrProposalMetadata>> {
    const results: Record<string, NostrProposalMetadata> = {}
    try {
      const timeoutPromise = new Promise<any[]>((resolve) =>
        setTimeout(() => resolve([]), 500),
      )
      const queryPromise = this.pool.querySync(relays, {
        kinds: [1],
        "#t": ["kreivo", "proposal"],
      })

      const events = await Promise.race([queryPromise, timeoutPromise])

      for (const event of events) {
        const hashTag = event.tags.find(
          (t: string[]) => t[0] === "proposal_hash",
        )
        if (hashTag && hashTag[1]) {
          try {
            const parsed = JSON.parse(event.content) as NostrProposalMetadata
            if (
              !results[hashTag[1]] ||
              (parsed.timestamp ?? 0) > (results[hashTag[1]]?.timestamp ?? 0)
            ) {
              results[hashTag[1]] = parsed
            }
          } catch (_e) {
            // ignore parse errors
          }
        }
      }
      return results
    } catch (err) {
      console.error("Error fetching all proposals from Nostr", err)
      return results
    }
  }

  static async publishComment(
    proposalId: string,
    content: string,
    authorName?: string,
    relays: string[] = this.RELAYS,
  ): Promise<string> {
    const sk = this.getOrCreateSecretKey()

    const eventTemplate: UnsignedEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["t", "kreivo-comment"],
        ["proposal_id", proposalId],
        ...(authorName ? [["name", authorName]] : []),
      ],
      content: content,
      pubkey: getPublicKey(sk),
    }

    const signedEvent = finalizeEvent(eventTemplate, sk)

    try {
      await Promise.any(this.pool.publish(relays, signedEvent))
      return signedEvent.id
    } catch (err) {
      console.error("Failed to publish comment", err)
      throw err
    }
  }

  static async getComments(
    proposalId: string,
    relays: string[] = this.RELAYS,
  ): Promise<NostrComment[]> {
    try {
      const events = await this.pool.querySync(relays, {
        kinds: [1],
        "#proposal_id": [proposalId],
      })

      return events
        .map((event) => ({
          id: event.id,
          pubkey: event.pubkey,
          content: event.content,
          createdAt: event.created_at * 1000,
          authorName: event.tags.find((t) => t[0] === "name")?.[1],
        }))
        .sort((a, b) => b.createdAt - a.createdAt)
    } catch (err) {
      console.error("Error fetching comments", err)
      return []
    }
  }

  private static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  private static hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) throw new Error("Invalid hex string")
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    return bytes
  }
}
