"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as chain from "@/lib/chain";
import * as db from "@/lib/db";
import { dailyCommitmentHash, randomSeedHex } from "@/lib/crypto";
import { COOLDOWN_SECONDS, STAKE_AMOUNT, ProofOfHealingContract } from "@/lib/contract/simulator";
import {
  adjustMockWalletBalance,
  clearMockWallet,
  connectWallet,
  hasNativeWallet,
  readMockWallet,
  type WalletState,
} from "@/lib/wallet";
import { clearPeerGroupMessages } from "@/lib/peer-group";
import { currentStreak, longestStreak, todayISO } from "@/lib/streak";
import { MILESTONES, type AccountState, type BadgeRecord, type DailyProofRecord, type Habit, type JournalEntry } from "@/lib/types";

export interface AppState {
  ready: boolean;
  wallet: WalletState | null;
  nativeWallet: boolean;
  account: AccountState | null;
  habits: Habit[];
  entries: JournalEntry[];
  proofs: DailyProofRecord[];
  badges: BadgeRecord[];
  streak: number;
  best: number;
  today: JournalEntry | null;
  cooldownRemaining: number;
  busy: string | null;
  powAttempts: number;
  error: string | null;
  notice: string | null;
}

export interface AppActions {
  connect(): Promise<void>;
  register(): Promise<void>;
  addHabit(input: { name: string; category: string; target: string }): Promise<void>;
  removeHabit(id: string): Promise<void>;
  saveToday(input: { completedHabitIds: string[]; mood: number; journal: string }): Promise<void>;
  submitDailyProof(): Promise<void>;
  claimMilestone(requiredDays: number): Promise<void>;
  checkPeerAccess(requiredDays: number): Promise<boolean>;
  wipe(): Promise<void>;
  dismiss(): void;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [account, setAccount] = useState<AccountState | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [proofs, setProofs] = useState<DailyProofRecord[]>([]);
  const [badges, setBadges] = useState<BadgeRecord[]>([]);
  const [lastProofAt, setLastProofAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [powAttempts, setPowAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const refresh = useCallback(async (seedHex: string) => {
    const [loadedHabits, loadedEntries, loadedProofs, loadedBadges, stats] = await Promise.all([
      db.listHabits(seedHex),
      db.listEntries(seedHex),
      db.listProofs(),
      db.listBadges(),
      chain.ledgerStats(),
    ]);
    setHabits(loadedHabits);
    setEntries(loadedEntries);
    setProofs(loadedProofs);
    setBadges(loadedBadges);
    setLastProofAt(stats.lastProofAt);
  }, []);

  useEffect(() => {
    void (async () => {
      // Reconnect the local development wallet so a reload does not silently
      // drop the wallet that owns the micro-bond.
      setWallet(readMockWallet());
      const stored = await db.loadAccount();
      if (stored) {
        setAccount(stored);
        await refresh(stored.seedHex);
      }
      setReady(true);
    })();
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const run = useCallback(
    async (label: string, action: () => Promise<string | void>) => {
      setBusy(label);
      setError(null);
      setNotice(null);
      setPowAttempts(0);
      try {
        const message = await action();
        if (message) setNotice(message);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setBusy(null);
        setPowAttempts(0);
      }
    },
    [],
  );

  const connect = useCallback(
    () =>
      run("connect", async () => {
        const connected = await connectWallet();
        setWallet(connected);
        return connected.native
          ? `Terhubung ke Midnight Extension Wallet.`
          : `Wallet pengembangan lokal aktif (ekstensi Midnight tidak terdeteksi).`;
      }),
    [run],
  );

  const register = useCallback(
    () =>
      run("register", async () => {
        if (!wallet) throw new Error("hubungkan wallet terlebih dahulu");
        if (wallet.balance < STAKE_AMOUNT) throw new Error("saldo testnet tidak cukup untuk deposit");
        const seedHex = randomSeedHex();
        const receipt = await chain.registerAndStake(seedHex, STAKE_AMOUNT, setPowAttempts);
        const created: AccountState = {
          seedHex,
          commitment: await ProofOfHealingContract.commitmentOf(seedHex),
          walletAddress: wallet.address,
          stakedAmount: STAKE_AMOUNT,
          registeredAt: new Date().toISOString(),
        };
        await db.saveAccount(created);
        setAccount(created);
        if (!wallet.native) setWallet(adjustMockWalletBalance(-STAKE_AMOUNT));
        await refresh(seedHex);
        return `Terdaftar anonim. Micro-bond terkunci, tx ${receipt.txId.slice(0, 12)}…`;
      }),
    [refresh, run, wallet],
  );

  const addHabit = useCallback(
    (input: { name: string; category: string; target: string }) =>
      run("habit", async () => {
        if (!account) throw new Error("belum terdaftar");
        const habit: Habit = {
          id: randomSeedHex().slice(0, 16),
          name: input.name.trim(),
          category: input.category.trim() || "Umum",
          target: input.target.trim() || "1x sehari",
          createdAt: new Date().toISOString(),
          archived: false,
        };
        if (!habit.name) throw new Error("nama kebiasaan wajib diisi");
        await db.saveHabit(account.seedHex, habit);
        await refresh(account.seedHex);
      }),
    [account, refresh, run],
  );

  const removeHabit = useCallback(
    (id: string) =>
      run("habit", async () => {
        if (!account) throw new Error("belum terdaftar");
        await db.deleteHabit(id);
        await refresh(account.seedHex);
      }),
    [account, refresh, run],
  );

  const saveToday = useCallback(
    (input: { completedHabitIds: string[]; mood: number; journal: string }) =>
      run("journal", async () => {
        if (!account) throw new Error("belum terdaftar");
        const date = todayISO();
        const entry: JournalEntry = {
          date,
          completedHabitIds: input.completedHabitIds,
          mood: input.mood,
          journal: input.journal,
          commitmentHash: await dailyCommitmentHash({
            seedHex: account.seedHex,
            date,
            habitIds: input.completedHabitIds,
            journal: input.journal,
          }),
          updatedAt: new Date().toISOString(),
        };
        await db.saveEntry(account.seedHex, entry);
        await refresh(account.seedHex);
        return "Catatan harian tersimpan terenkripsi di perangkat ini.";
      }),
    [account, refresh, run],
  );

  const submitDailyProof = useCallback(
    () =>
      run("proof", async () => {
        if (!account) throw new Error("belum terdaftar");
        const entry = await db.getEntry(account.seedHex, todayISO());
        if (!entry) throw new Error("catat kebiasaan hari ini sebelum mengirim bukti");
        if (entry.completedHabitIds.length === 0) {
          throw new Error("centang minimal satu kebiasaan hari ini");
        }
        const receipt = await chain.submitDailyProof(
          account.seedHex,
          entry.commitmentHash,
          setPowAttempts,
        );
        await db.saveProof({
          date: entry.date,
          commitmentHash: entry.commitmentHash,
          blockTime: receipt.blockTime,
          powNonce: receipt.pow?.nonce ?? 0,
          powDigest: receipt.pow?.digest ?? "",
          txId: receipt.txId,
        });
        await refresh(account.seedHex);
        return `Bukti harian diterima kontrak, tx ${receipt.txId.slice(0, 12)}…`;
      }),
    [account, refresh, run],
  );

  const streak = useMemo(() => currentStreak(entries), [entries]);
  const best = useMemo(() => longestStreak(entries), [entries]);

  const claimMilestone = useCallback(
    (requiredDays: number) =>
      run("milestone", async () => {
        if (!account) throw new Error("belum terdaftar");
        const refundable = account.stakedAmount;
        const receipt = await chain.claimMilestone(account.seedHex, streak, requiredDays);
        await db.saveBadge({
          requiredDays,
          claimedAt: new Date().toISOString(),
          txId: receipt.txId,
          proofId: receipt.proof.proofId,
        });

        // The bond is refunded by the first milestone only; later badges must not
        // credit the wallet again.
        let refundLanded = false;
        if (refundable > 0) {
          if (wallet?.native) {
            refundLanded = true;
          } else {
            const credited = adjustMockWalletBalance(refundable);
            refundLanded = credited !== null;
            if (credited) setWallet(credited);
          }
          if (refundLanded) {
            const refunded: AccountState = {
              ...account,
              stakedAmount: 0,
              refundedAt: new Date().toISOString(),
            };
            await db.saveAccount(refunded);
            setAccount(refunded);
          }
        }
        await refresh(account.seedHex);
        if (refundable > 0 && !refundLanded) {
          return `ZK Badge ${requiredDays} hari diterbitkan. Hubungkan wallet untuk menarik deposit.`;
        }
        return refundable > 0
          ? `ZK Badge ${requiredDays} hari diterbitkan, deposit dikembalikan.`
          : `ZK Badge ${requiredDays} hari diterbitkan.`;
      }),
    [account, refresh, run, streak, wallet],
  );

  const checkPeerAccess = useCallback(
    async (requiredDays: number) => {
      if (!account) return false;
      try {
        return await chain.provePeerGroupAccess(account.seedHex, requiredDays);
      } catch {
        return false;
      }
    },
    [account],
  );

  const wipe = useCallback(
    () =>
      run("wipe", async () => {
        await db.wipeLocalData();
        clearPeerGroupMessages();
        clearMockWallet();
        setWallet(null);
        setAccount(null);
        setHabits([]);
        setEntries([]);
        setProofs([]);
        setBadges([]);
        setLastProofAt(null);
        return "Semua data lokal dihapus dari perangkat ini.";
      }),
    [run],
  );

  const today = useMemo(
    () => entries.find((entry) => entry.date === todayISO()) ?? null,
    [entries],
  );

  const cooldownRemaining = useMemo(() => {
    if (lastProofAt === null || lastProofAt === 0) return 0;
    return Math.max(0, lastProofAt + COOLDOWN_SECONDS - now);
  }, [lastProofAt, now]);

  const value = useMemo<AppState & AppActions>(
    () => ({
      ready,
      wallet,
      nativeWallet: hasNativeWallet(),
      account,
      habits,
      entries,
      proofs,
      badges,
      streak,
      best,
      today,
      cooldownRemaining,
      busy,
      powAttempts,
      error,
      notice,
      connect,
      register,
      addHabit,
      removeHabit,
      saveToday,
      submitDailyProof,
      claimMilestone,
      checkPeerAccess,
      wipe,
      dismiss: () => {
        setError(null);
        setNotice(null);
      },
    }),
    [
      account,
      addHabit,
      badges,
      best,
      busy,
      checkPeerAccess,
      claimMilestone,
      connect,
      cooldownRemaining,
      entries,
      error,
      habits,
      notice,
      powAttempts,
      proofs,
      ready,
      register,
      removeHabit,
      saveToday,
      streak,
      submitDailyProof,
      today,
      wallet,
      wipe,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState & AppActions {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}

export { MILESTONES };
