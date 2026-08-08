import { describe, expect, it } from "vitest";
import {
  COOLDOWN_SECONDS,
  ProofOfHealingContract,
  STAKE_AMOUNT,
  emptyLedger,
} from "@/lib/contract/simulator";
import { ContractAssertionError } from "@/lib/contract/errors";
import { dailyCommitmentHash, randomSeedHex } from "@/lib/crypto";

const T0 = 1_800_000_000;

async function registered(seed = randomSeedHex()) {
  const contract = new ProofOfHealingContract(emptyLedger());
  await contract.registerAndStake(seed, STAKE_AMOUNT);
  return { contract, seed };
}

async function commitment(seed: string, date: string) {
  return dailyCommitmentHash({ seedHex: seed, date, habitIds: ["habit-1"], journal: "" });
}

describe("registerAndStake", () => {
  it("locks the micro-bond and only exposes an unlinkable commitment", async () => {
    const seed = randomSeedHex();
    const { contract } = await registered(seed);
    const snapshot = contract.snapshot();
    const key = await ProofOfHealingContract.commitmentOf(seed);

    expect(Object.keys(snapshot.userCommitments)).toEqual([key]);
    expect(key).not.toContain(seed);
    expect(snapshot.stakedBond[key]).toBe(STAKE_AMOUNT);
    expect(snapshot.totalRegistered).toBe(1);
  });

  it("rejects a stake below the required micro-bond", async () => {
    const contract = new ProofOfHealingContract(emptyLedger());
    await expect(contract.registerAndStake(randomSeedHex(), STAKE_AMOUNT - 1)).rejects.toThrow(
      /stake below required micro-bond/,
    );
  });

  it("rejects double registration of the same seed (Sybil guard)", async () => {
    const { contract, seed } = await registered();
    await expect(contract.registerAndStake(seed, STAKE_AMOUNT)).rejects.toThrow(/already registered/);
  });
});

describe("verifyDailyHabit cooldown", () => {
  it("accepts the first daily proof right after registration", async () => {
    const { contract, seed } = await registered();
    await contract.verifyDailyHabit(seed, await commitment(seed, "2026-08-08"), T0);
    expect(contract.snapshot().dailyProofCount[await ProofOfHealingContract.commitmentOf(seed)]).toBe(1);
  });

  it("rejects a second proof before 18 hours have passed", async () => {
    const { contract, seed } = await registered();
    await contract.verifyDailyHabit(seed, await commitment(seed, "2026-08-08"), T0);
    await expect(
      contract.verifyDailyHabit(seed, await commitment(seed, "2026-08-09"), T0 + COOLDOWN_SECONDS - 1),
    ).rejects.toThrow(/bot detected/);
  });

  it("accepts a proof exactly at the 18 hour boundary", async () => {
    const { contract, seed } = await registered();
    await contract.verifyDailyHabit(seed, await commitment(seed, "2026-08-08"), T0);
    await contract.verifyDailyHabit(
      seed,
      await commitment(seed, "2026-08-09"),
      T0 + COOLDOWN_SECONDS,
    );
    expect(contract.snapshot().dailyProofCount[await ProofOfHealingContract.commitmentOf(seed)]).toBe(2);
  });

  it("rejects an empty daily commitment", async () => {
    const { contract, seed } = await registered();
    await expect(contract.verifyDailyHabit(seed, "0".repeat(64), T0)).rejects.toThrow(
      ContractAssertionError,
    );
  });

  it("rejects a proof from a seed that never registered", async () => {
    const { contract } = await registered();
    const stranger = randomSeedHex();
    await expect(
      contract.verifyDailyHabit(stranger, await commitment(stranger, "2026-08-08"), T0),
    ).rejects.toThrow(/not registered/);
  });
});

describe("verifyStreakMilestone", () => {
  async function withProofs(days: number) {
    const { contract, seed } = await registered();
    for (let day = 0; day < days; day += 1) {
      await contract.verifyDailyHabit(
        seed,
        await commitment(seed, `day-${day}`),
        T0 + day * COOLDOWN_SECONDS,
      );
    }
    return { contract, seed };
  }

  it("mints the badge and refunds the bond once the streak is proven", async () => {
    const { contract, seed } = await withProofs(7);
    await contract.verifyStreakMilestone(seed, 7, 7);

    const key = await ProofOfHealingContract.commitmentOf(seed);
    const snapshot = contract.snapshot();
    expect(snapshot.claimedBadges[key]).toBe(7);
    expect(snapshot.stakedBond[key]).toBe(0);
    expect(snapshot.totalMilestonesVerified).toBe(1);
  });

  it("rejects a streak below the threshold", async () => {
    const { contract, seed } = await withProofs(7);
    await expect(contract.verifyStreakMilestone(seed, 6, 7)).rejects.toThrow(
      /streak below milestone threshold/,
    );
  });

  it("rejects a claimed streak not backed by enough on-chain proofs", async () => {
    const { contract, seed } = await withProofs(3);
    await expect(contract.verifyStreakMilestone(seed, 7, 7)).rejects.toThrow(
      /not enough daily proofs on chain/,
    );
  });

  it("rejects re-claiming the same milestone", async () => {
    const { contract, seed } = await withProofs(7);
    await contract.verifyStreakMilestone(seed, 7, 7);
    await expect(contract.verifyStreakMilestone(seed, 7, 7)).rejects.toThrow(
      /milestone already claimed/,
    );
  });

  it("blocks further daily proofs once the bond is refunded", async () => {
    const { contract, seed } = await withProofs(7);
    await contract.verifyStreakMilestone(seed, 7, 7);
    await expect(
      contract.verifyDailyHabit(
        seed,
        await commitment(seed, "after"),
        T0 + 100 * COOLDOWN_SECONDS,
      ),
    ).rejects.toThrow(/micro-bond not locked/);
  });
});

describe("provePeerGroupAccess", () => {
  it("grants access with a sufficient badge and denies it otherwise", async () => {
    const { contract, seed } = await registered();
    for (let day = 0; day < 7; day += 1) {
      await contract.verifyDailyHabit(
        seed,
        await commitment(seed, `day-${day}`),
        T0 + day * COOLDOWN_SECONDS,
      );
    }
    await contract.verifyStreakMilestone(seed, 7, 7);

    await expect(contract.provePeerGroupAccess(seed, 7)).resolves.toBe(true);
    await expect(contract.provePeerGroupAccess(seed, 30)).resolves.toBe(false);
    await expect(contract.provePeerGroupAccess(randomSeedHex(), 7)).rejects.toThrow(/no badge/);
  });
});
