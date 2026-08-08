export interface Habit {
  id: string;
  name: string;
  /** Free-form category, e.g. "Meditasi", "Terapi", "Obat". */
  category: string;
  /** Daily target, e.g. "15 menit". */
  target: string;
  createdAt: string;
  archived: boolean;
}

export interface JournalEntry {
  /** Local date in YYYY-MM-DD, the unit the streak is computed on. */
  date: string;
  completedHabitIds: string[];
  mood: number;
  journal: string;
  /** Local commitment hash, the only value ever shown to the chain. */
  commitmentHash: string;
  updatedAt: string;
}

export interface DailyProofRecord {
  date: string;
  commitmentHash: string;
  blockTime: number;
  powNonce: number;
  powDigest: string;
  txId: string;
}

export interface BadgeRecord {
  requiredDays: number;
  claimedAt: string;
  txId: string;
  proofId: string;
}

export interface AccountState {
  /** Locally generated secret; never leaves the device. */
  seedHex: string;
  commitment: string;
  walletAddress: string;
  stakedAmount: number;
  registeredAt: string;
  refundedAt?: string;
}

export const MILESTONES = [7, 14, 30] as const;
export type Milestone = (typeof MILESTONES)[number];
