import { describe, expect, it } from "vitest";
import { dailyCommitmentHash, randomSeedHex, seal, unseal } from "@/lib/crypto";
import { solveProofOfWork, verifyProofOfWork } from "@/lib/pow";
import { currentStreak, longestStreak, nextMilestone, shiftISO } from "@/lib/streak";
import type { JournalEntry } from "@/lib/types";

describe("local encryption (FR-2.1)", () => {
  it("round-trips a journal entry and leaks no plaintext", async () => {
    const seed = randomSeedHex();
    const entry = { journal: "hari ini saya menangis di terapi", mood: 2 };
    const box = await seal(seed, entry);

    expect(box.ciphertext).not.toContain("terapi");
    expect(await unseal(seed, box)).toEqual(entry);
  });

  it("cannot be decrypted with a different seed", async () => {
    const box = await seal(randomSeedHex(), { journal: "rahasia" });
    await expect(unseal(randomSeedHex(), box)).rejects.toThrow();
  });
});

describe("daily commitment hash (FR-2.3)", () => {
  it("is deterministic, order independent, and hides the journal body", async () => {
    const seedHex = randomSeedHex();
    const base = { seedHex, date: "2026-08-08", journal: "meditasi 20 menit" };

    const a = await dailyCommitmentHash({ ...base, habitIds: ["h1", "h2"] });
    const b = await dailyCommitmentHash({ ...base, habitIds: ["h2", "h1"] });
    const different = await dailyCommitmentHash({ ...base, habitIds: ["h1"] });

    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).not.toBe(different);
    expect(a).not.toContain("meditasi");
  });

  it("is unlinkable across users writing the same journal", async () => {
    const shared = { date: "2026-08-08", habitIds: ["h1"], journal: "sama" };
    const first = await dailyCommitmentHash({ ...shared, seedHex: randomSeedHex() });
    const second = await dailyCommitmentHash({ ...shared, seedHex: randomSeedHex() });
    expect(first).not.toBe(second);
  });
});

describe("client side proof-of-work (FR-1.2)", () => {
  it("produces a nonce whose digest meets the difficulty and verifies", async () => {
    const result = await solveProofOfWork("challenge", 3);
    expect(result.digest.startsWith("000")).toBe(true);
    expect(await verifyProofOfWork("challenge", result, 3)).toBe(true);
  });

  it("rejects a nonce mined for a different challenge", async () => {
    const result = await solveProofOfWork("challenge-a", 3);
    expect(await verifyProofOfWork("challenge-b", result, 3)).toBe(false);
  });
});

describe("streak accounting", () => {
  const entry = (date: string, completed = true): JournalEntry => ({
    date,
    completedHabitIds: completed ? ["h1"] : [],
    mood: 3,
    journal: "",
    commitmentHash: "a".repeat(64),
    updatedAt: `${date}T00:00:00.000Z`,
  });

  it("counts consecutive days ending today", () => {
    const today = "2026-08-08";
    const entries = [-2, -1, 0].map((offset) => entry(shiftISO(today, offset)));
    expect(currentStreak(entries, today)).toBe(3);
  });

  it("does not reset while today is still unlogged", () => {
    const today = "2026-08-08";
    const entries = [-2, -1].map((offset) => entry(shiftISO(today, offset)));
    expect(currentStreak(entries, today)).toBe(2);
  });

  it("breaks on a gap and on a day with no completed habit", () => {
    const today = "2026-08-08";
    const entries = [entry(shiftISO(today, -5)), entry(today, false)];
    expect(currentStreak(entries, today)).toBe(0);
  });

  it("tracks the longest historical streak and the next milestone", () => {
    const entries = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-10"].map((date) =>
      entry(date),
    );
    expect(longestStreak(entries)).toBe(3);
    expect(nextMilestone(3, [7, 14, 30])).toBe(7);
    expect(nextMilestone(30, [7, 14, 30])).toBeNull();
  });
});
