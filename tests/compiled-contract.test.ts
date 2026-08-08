/**
 * Runs the *compiled* Compact contract (compactc output in `contracts/build`)
 * through the Midnight compact runtime, so the ledger rules are verified against
 * the real circuits instead of only against the TypeScript mirror.
 */
import { describe, expect, it } from "vitest";
import {
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
  type CircuitContext,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  ledger,
  pureCircuits,
  type Ledger,
} from "../contracts/build/contract/index.js";

const COIN_PUBLIC_KEY = "0".repeat(64);
const SEED_A = new Uint8Array(32).fill(7);
const SEED_B = new Uint8Array(32).fill(9);
const DAILY_HASH = new Uint8Array(32).fill(3);
const DAY = 86_400n;

type PrivateState = Record<string, never>;

function contractAndContext() {
  const contract = new Contract<PrivateState>({});
  const { currentContractState, currentPrivateState, currentZswapLocalState } =
    contract.initialState(createConstructorContext({}, COIN_PUBLIC_KEY));

  const context = createCircuitContext(
    dummyContractAddress(),
    currentZswapLocalState,
    currentContractState.data,
    currentPrivateState,
  );

  return { contract, context };
}

function ledgerOf(context: CircuitContext<PrivateState>): Ledger {
  return ledger(context.currentQueryContext.state);
}

describe("compiled Compact contract", () => {
  it("exposes the micro-bond and cooldown constants from the circuits", () => {
    expect(pureCircuits.cooldownSeconds()).toBe(64_800n);
    expect(pureCircuits.requiredStake()).toBe(1_000_000n);
  });

  it("registers a user once and locks the micro-bond", () => {
    const { contract, context } = contractAndContext();
    const { context: afterRegister } = contract.impureCircuits.registerAndStake(
      context,
      SEED_A,
      1_000_000n,
    );

    const state = ledgerOf(afterRegister);
    expect(state.totalRegistered).toBe(1n);
    expect(state.userCommitments.size()).toBe(1n);
    const commitment = [...state.stakedBond][0][0];
    expect(state.stakedBond.lookup(commitment)).toBe(1_000_000n);

    expect(() =>
      contract.impureCircuits.registerAndStake(afterRegister, SEED_A, 1_000_000n),
    ).toThrow(/already registered/);
  });

  it("rejects a stake below the micro-bond", () => {
    const { contract, context } = contractAndContext();
    expect(() => contract.impureCircuits.registerAndStake(context, SEED_A, 999_999n)).toThrow(
      /stake below required micro-bond/,
    );
  });

  it("rejects a daily proof from an unregistered user", () => {
    const { contract, context } = contractAndContext();
    expect(() =>
      contract.impureCircuits.verifyDailyHabit(context, SEED_B, DAILY_HASH, DAY),
    ).toThrow(/not registered/);
  });

  it("enforces the 18 hour cooldown between daily proofs", () => {
    const { contract, context } = contractAndContext();
    const { context: registered } = contract.impureCircuits.registerAndStake(
      context,
      SEED_A,
      1_000_000n,
    );

    const { context: firstProof } = contract.impureCircuits.verifyDailyHabit(
      registered,
      SEED_A,
      DAILY_HASH,
      DAY,
    );
    expect([...ledgerOf(firstProof).dailyProofCount][0][1]).toBe(1n);

    expect(() =>
      contract.impureCircuits.verifyDailyHabit(
        firstProof,
        SEED_A,
        DAILY_HASH,
        DAY + 64_799n,
      ),
    ).toThrow(/interaction too fast/);

    const { context: secondProof } = contract.impureCircuits.verifyDailyHabit(
      firstProof,
      SEED_A,
      DAILY_HASH,
      DAY + 64_800n,
    );
    expect([...ledgerOf(secondProof).dailyProofCount][0][1]).toBe(2n);
  });

  it("rejects an empty daily commitment hash", () => {
    const { contract, context } = contractAndContext();
    const { context: registered } = contract.impureCircuits.registerAndStake(
      context,
      SEED_A,
      1_000_000n,
    );

    expect(() =>
      contract.impureCircuits.verifyDailyHabit(registered, SEED_A, new Uint8Array(32), DAY),
    ).toThrow(/empty daily commitment/);
  });

  it("issues a badge, refunds the bond and gates the peer group", () => {
    const { contract, context } = contractAndContext();
    let current = contract.impureCircuits.registerAndStake(context, SEED_A, 1_000_000n).context;

    for (let day = 0; day < 7; day += 1) {
      current = contract.impureCircuits.verifyDailyHabit(
        current,
        SEED_A,
        DAILY_HASH,
        DAY + BigInt(day) * 64_800n,
      ).context;
    }

    expect(() =>
      contract.impureCircuits.verifyStreakMilestone(current, SEED_A, 6n, 7n),
    ).toThrow(/streak below milestone threshold/);

    current = contract.impureCircuits.verifyStreakMilestone(current, SEED_A, 7n, 7n).context;

    const state = ledgerOf(current);
    const commitment = [...state.claimedBadges][0][0];
    expect(state.claimedBadges.lookup(commitment)).toBe(7n);
    expect(state.stakedBond.lookup(commitment)).toBe(0n);
    expect(state.totalMilestonesVerified).toBe(1n);

    expect(() =>
      contract.impureCircuits.verifyStreakMilestone(current, SEED_A, 7n, 7n),
    ).toThrow(/milestone already claimed/);

    expect(contract.impureCircuits.provePeerGroupAccess(current, SEED_A, 7n).result).toBe(true);
    expect(contract.impureCircuits.provePeerGroupAccess(current, SEED_A, 14n).result).toBe(false);
    expect(() => contract.impureCircuits.provePeerGroupAccess(current, SEED_B, 7n)).toThrow(
      /no badge/,
    );
  });

  it("keeps the TypeScript mirror's economics in sync with the circuits", async () => {
    const { COOLDOWN_SECONDS, STAKE_AMOUNT } = await import("../src/lib/contract/simulator");

    expect(BigInt(COOLDOWN_SECONDS)).toBe(pureCircuits.cooldownSeconds());
    expect(BigInt(STAKE_AMOUNT)).toBe(pureCircuits.requiredStake());
  });
});
