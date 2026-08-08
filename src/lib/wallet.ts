import { randomSeedHex } from "./crypto";

export interface WalletState {
  address: string;
  balance: number;
  network: string;
  /** True when the browser exposes a real Midnight extension wallet. */
  native: boolean;
}

export interface MidnightWalletApi {
  enable(): Promise<{ state(): Promise<{ address: string; balance?: bigint | number }> }>;
  serviceUriConfig?(): Promise<Record<string, string>>;
}

declare global {
  interface Window {
    midnight?: { mnLace?: MidnightWalletApi } & Record<string, MidnightWalletApi | undefined>;
  }
}

const MOCK_STORAGE_KEY = "poh.mock-wallet";
const MOCK_INITIAL_BALANCE = 25_000_000;

function detectInjectedWallet(): MidnightWalletApi | null {
  if (typeof window === "undefined" || !window.midnight) return null;
  return window.midnight.mnLace ?? Object.values(window.midnight).find(Boolean) ?? null;
}

export function hasNativeWallet(): boolean {
  return detectInjectedWallet() !== null;
}

export function readMockWallet(): WalletState | null {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(MOCK_STORAGE_KEY) : null;
  return stored ? (JSON.parse(stored) as WalletState) : null;
}

function readOrCreateMockWallet(): WalletState {
  const stored = readMockWallet();
  if (stored) return stored;
  const wallet: WalletState = {
    address: `mn_shield-addr_test1${randomSeedHex().slice(0, 32)}`,
    balance: MOCK_INITIAL_BALANCE,
    network: "testnet (local simulator)",
    native: false,
  };
  window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(wallet));
  return wallet;
}

export function writeMockWallet(wallet: WalletState): void {
  window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(wallet));
}

export function clearMockWallet(): void {
  window.localStorage.removeItem(MOCK_STORAGE_KEY);
}

/**
 * Moves `amount` in or out of the local development wallet. Reads from storage
 * instead of React state so a refund still lands when the session was reloaded
 * and no wallet is currently connected in the UI.
 */
export function adjustMockWalletBalance(amount: number): WalletState | null {
  const stored = readMockWallet();
  if (!stored) return null;
  const updated = { ...stored, balance: stored.balance + amount };
  writeMockWallet(updated);
  return updated;
}

/**
 * Connects the Midnight Extension Wallet when present, otherwise falls back to
 * a local development wallet so the whole flow stays testable without the
 * extension and the Midnight dev container.
 */
export async function connectWallet(): Promise<WalletState> {
  const injected = detectInjectedWallet();
  if (!injected) return readOrCreateMockWallet();

  const connector = await injected.enable();
  const state = await connector.state();
  return {
    address: state.address,
    balance: Number(state.balance ?? 0),
    network: "Midnight testnet",
    native: true,
  };
}
