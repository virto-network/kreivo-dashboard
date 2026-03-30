/**
 * Metadata for a proposal stored on Nostr
 */
export interface NostrProposalMetadata {
  id?: string
  title: string
  description: string
  communityId?: number
  track?: string
  proposer?: string
  timestamp?: number
}

/**
 * Comment structure from Nostr
 */
export interface NostrComment {
  id: string
  pubkey: string
  content: string
  createdAt: number
  authorName?: string
}
