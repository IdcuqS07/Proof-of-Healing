import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { seal, unseal, type SealedBox } from "./crypto";
import type {
  AccountState,
  BadgeRecord,
  DailyProofRecord,
  Habit,
  JournalEntry,
} from "./types";
import type { LedgerSnapshot } from "./contract/simulator";

const DB_NAME = "proof-of-healing";
const DB_VERSION = 1;

interface PoHSchema extends DBSchema {
  /** The device-local account, including the secret seed used as key material. */
  account: { key: "self"; value: AccountState };
  /** Habits and journal entries, AES-256-GCM sealed under the account seed. */
  habits: { key: string; value: SealedBox };
  entries: { key: string; value: SealedBox };
  /** Non-sensitive receipts of what was already proven on chain. */
  proofs: { key: string; value: DailyProofRecord };
  badges: { key: number; value: BadgeRecord };
  /** Local mirror of the Compact ledger when running against the simulator. */
  ledger: { key: "state"; value: LedgerSnapshot };
}

let dbPromise: Promise<IDBPDatabase<PoHSchema>> | null = null;

function db(): Promise<IDBPDatabase<PoHSchema>> {
  dbPromise ??= openDB<PoHSchema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore("account");
      database.createObjectStore("habits");
      database.createObjectStore("entries");
      database.createObjectStore("proofs");
      database.createObjectStore("badges");
      database.createObjectStore("ledger");
    },
  });
  return dbPromise;
}

export async function loadAccount(): Promise<AccountState | null> {
  return (await (await db()).get("account", "self")) ?? null;
}

export async function saveAccount(account: AccountState): Promise<void> {
  await (await db()).put("account", account, "self");
}

export async function saveHabit(seedHex: string, habit: Habit): Promise<void> {
  await (await db()).put("habits", await seal(seedHex, habit), habit.id);
}

export async function deleteHabit(id: string): Promise<void> {
  await (await db()).delete("habits", id);
}

export async function listHabits(seedHex: string): Promise<Habit[]> {
  const boxes = await (await db()).getAll("habits");
  const habits = await Promise.all(boxes.map((box) => unseal<Habit>(seedHex, box)));
  return habits.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function saveEntry(seedHex: string, entry: JournalEntry): Promise<void> {
  await (await db()).put("entries", await seal(seedHex, entry), entry.date);
}

export async function getEntry(seedHex: string, date: string): Promise<JournalEntry | null> {
  const box = await (await db()).get("entries", date);
  return box ? unseal<JournalEntry>(seedHex, box) : null;
}

export async function listEntries(seedHex: string): Promise<JournalEntry[]> {
  const boxes = await (await db()).getAll("entries");
  const entries = await Promise.all(boxes.map((box) => unseal<JournalEntry>(seedHex, box)));
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveProof(proof: DailyProofRecord): Promise<void> {
  await (await db()).put("proofs", proof, proof.date);
}

export async function listProofs(): Promise<DailyProofRecord[]> {
  return (await (await db()).getAll("proofs")).sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveBadge(badge: BadgeRecord): Promise<void> {
  await (await db()).put("badges", badge, badge.requiredDays);
}

export async function listBadges(): Promise<BadgeRecord[]> {
  return (await (await db()).getAll("badges")).sort((a, b) => a.requiredDays - b.requiredDays);
}

export async function loadLedger(): Promise<LedgerSnapshot | null> {
  return (await (await db()).get("ledger", "state")) ?? null;
}

export async function saveLedger(snapshot: LedgerSnapshot): Promise<void> {
  await (await db()).put("ledger", snapshot, "state");
}

/** Wipes every trace of the user from the device. */
export async function wipeLocalData(): Promise<void> {
  const database = await db();
  await Promise.all(
    (["account", "habits", "entries", "proofs", "badges", "ledger"] as const).map((store) =>
      database.clear(store),
    ),
  );
}
