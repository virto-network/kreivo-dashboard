/**
 * Common Tally structure from Kreivo Community Referenda
 */
export interface Tally {
  ayes: bigint
  nays: bigint
  support?: bigint
}

/**
 * Standardized Referendum Status
 */
export type ReferendumStatus =
  | "Preparing"
  | "Active"
  | "Passed"
  | "Rejected"
  | "Cancelled"
  | "TimedOut"
  | "Killed"
  | "Executed"
  | "Unknown"
  | "Loading blockchain..."

/**
 * UI-focused Bounty/Proposal interface
 */
export interface Bounty {
  id: string
  title: string
  description: string
  category: string
  categoryColor: string
  status: ReferendumStatus
  track: string
  timeLeft?: string
  votingStats?: {
    for: number
    against: number
  }
  startBlock?: number
  endBlock?: number
}

/**
 * Detailed Voting Data for UI components
 */
export interface VotingDetail {
  timeLeft: string
  supportThreshold: number
  approvalThreshold: number
  forVotes: number
  forPercentage: number
  forCount: number
  againstVotes: number
  againstPercentage: number
  againstCount: number
  quorumCurrent: number
  quorumRequired: number
  quorumReached: boolean
  votingPower: number
  showCurves: boolean
  curves:
    | { decisionPeriod: number; support: any; approval: any }
    | null
    | undefined
  progress: number
  currentApproval: number
  currentSupport: number
}

/**
 * Information block data
 */
export interface BountyInformationData {
  votingSystem: string
  snapshot: string
  startBlock: number | null
  endBlock: number | null
  created: string
}

/**
 * Recent Voter entry
 */
export interface RecentVoter {
  address: string
  vote: "for" | "against" | "abstain"
  amount: number
  timestamp: string
}

/**
 * Full Detailed Bounty Data for BountyDetail page
 */
export interface BountyDetailData extends Omit<Bounty, "votingStats"> {
  communityId: number | null
  decisionDepositNeeded: boolean
  proposer: {
    address: string
    avatar?: string
  }
  track: string
  startDate: string | { date: string; time: string }
  endDate: string | { date: string; time: string }
  voting: VotingDetail
  information: BountyInformationData
  recentVoters: RecentVoter[]
  syncing: boolean
}

/**
 * Community summary for listings
 */
export interface Community {
  id: number
  name: string
  members: number
}

/**
 * Initiative summary (often mapped from referendums)
 */
export interface Initiative {
  id: number
  name: string
  progress: number // 0-100 percentage
  status: "active" | "completed" | "pending"
  ayes?: number
  nays?: number
}
