import { persistentHash } from "@/lib/crypto";
import { assert } from "./errors";

/**
 * Faithful TypeScript mirror of `contracts/src/ProofOfHealingNative.compact`.
 *
 * The browser talks to this simulator whenever no Midnight proof server /
 * deployed contract address is configured, so the whole dApp flow (and the test
 * suite) exercises exactly the assertions the on-chain circuits enforce.
 */

export const COOLDOWN_SECONDS = 64_800;
export const STAKE_AMOUNT = 1_000_000;

export interface LedgerSnapshot {
  userCommitments: Record<string, number>;
  stakedBond: Record<string, number>;
  dailyProofCount: Record<string, number>;
  claimedBadges: Record<string, number>;
  totalMilestonesVerified: number;
  totalRegistered: number;
}

export function emptyLedger(): LedgerSnapshot {
  return {
    userCommitments: {},
    stakedBond: {},
    dailyProofCount: {},
    claimedBadges: {},
    totalMilestonesVerified: 0,
    totalRegistered: 0,
  };
}

const ZERO_HASH = "0".repeat(64);

export class ProofOfHealingContract {
  constructor(private ledger: LedgerSnapshot = emptyLedger()) {}

  snapshot(): LedgerSnapshot {
    return structuredClone(this.ledger);
  }

  static commitmentOf(userSecretSeed: string): Promise<string> {
    return persistentHash(userSecretSeed);
  }

  async registerAndStake(userSecretSeed: string, stakeAmount: number): Promise<void> {
    const commitment = await ProofOfHealingContract.commitmentOf(userSecretSeed);
    assert(!(commitment in this.ledger.userCommitments), "already registered");
    assert(stakeAmount >= STAKE_AMOUNT, "stake below required micro-bond");

    this.ledger.userCommitments[commitment] = 0;
    this.ledger.stakedBond[commitment] = stakeAmount;
    this.ledger.dailyProofCount[commitment] = 0;
    this.ledger.totalRegistered += 1;
  }

  async verifyDailyHabit(
    userSecretSeed: string,
    dailyCommitmentHash: string,
    blockTime: number,
  ): Promise<void> {
    const commitment = await ProofOfHealingContract.commitmentOf(userSecretSeed);
    assert(commitment in this.ledger.userCommitments, "not registered");
    assert((this.ledger.stakedBond[commitment] ?? 0) >= STAKE_AMOUNT, "micro-bond not locked");

    const lastTimestamp = this.ledger.userCommitments[commitment];
    assert(
      blockTime - lastTimestamp >= COOLDOWN_SECONDS,
      "interaction too fast (bot detected)",
    );
    assert(
      dailyCommitmentHash.length === 64 && dailyCommitmentHash !== ZERO_HASH,
      "empty daily commitment",
    );

    this.ledger.userCommitments[commitment] = blockTime;
    this.ledger.dailyProofCount[commitment] += 1;
  }

  async verifyStreakMilestone(
    userSecretSeed: string,
    streakLength: number,
    requiredDays: number,
  ): Promise<void> {
    const commitment = await ProofOfHealingContract.commitmentOf(userSecretSeed);
    assert(commitment in this.ledger.userCommitments, "not registered");
    assert(streakLength >= requiredDays, "streak below milestone threshold");
    assert(
      (this.ledger.dailyProofCount[commitment] ?? 0) >= requiredDays,
      "not enough daily proofs on chain",
    );

    const previousBadge = this.ledger.claimedBadges[commitment] ?? 0;
    assert(requiredDays > previousBadge, "milestone already claimed");

    this.ledger.claimedBadges[commitment] = requiredDays;
    this.ledger.stakedBond[commitment] = 0;
    this.ledger.totalMilestonesVerified += 1;
  }

  async provePeerGroupAccess(userSecretSeed: string, requiredDays: number): Promise<boolean> {
    const commitment = await ProofOfHealingContract.commitmentOf(userSecretSeed);
    assert(commitment in this.ledger.claimedBadges, "no badge");
    return this.ledger.claimedBadges[commitment] >= requiredDays;
  }
}
