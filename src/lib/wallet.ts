import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { randomSeedHex } from "./crypto";

export interface WalletState {
  address: string;
  balance: number;
  network: string;
  /** True when the browser exposes a real Midnight extension wallet. */
  native: boolean;
  /** Name reported by the injected wallet, e.g. "Lace". */
  walletName?: string;
  /** Indexer/node/proof server the connected wallet is pointing at. */
  services?: { indexerUri: string; substrateNodeUri: string; proverServerUri?: string };
}

const MOCK_STORAGE_KEY = "poh.mock-wallet";
const MOCK_INITIAL_BALANCE = 25_000_000;
const NETWORK_ID = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK_ID ?? "testnet";

/**
 * Picks an injected wallet following the DApp Connector API: wallets register
 * themselves under `window.midnight[<rdns-ish key>]`, so prefer Lace and fall
 * back to whichever instance exposes `connect`.
 */
function detectInjectedWallet(): InitialAPI | null {
  if (typeof window === "undefined" || !window.midnight) return null;
  const candidates = Object.values(window.midnight).filter(
    (api): api is InitialAPI => typeof api?.connect === "function",
  );
  return candidates.find((api) => api.rdns?.includes("lace")) ?? candidates[0] ?? null;
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

/** Total shielded balance across every token the wallet holds. */
async function shieldedBalance(connected: ConnectedAPI): Promise<bigint> {
  const balances = await connected.getShieldedBalances();
  return Object.values(balances).reduce((total, amount) => total + amount, 0n);
}

/**
 * Connects the Midnight Extension Wallet through the DApp Connector API when it
 * is present, otherwise falls back to a local development wallet so the whole
 * flow stays testable without the extension and the Midnight dev container.
 */
export async function connectWallet(): Promise<WalletState> {
  const injected = detectInjectedWallet();
  if (!injected) return readOrCreateMockWallet();

  const connected = await injected.connect(NETWORK_ID);
  await connected.hintUsage(["getShieldedAddresses", "getShieldedBalances", "getConfiguration"]);

  const [{ shieldedAddress }, balance, configuration] = await Promise.all([
    connected.getShieldedAddresses(),
    shieldedBalance(connected),
    connected.getConfiguration(),
  ]);

  return {
    address: shieldedAddress,
    balance: Number(balance),
    network: configuration.networkId,
    native: true,
    walletName: injected.name,
    services: {
      indexerUri: configuration.indexerUri,
      substrateNodeUri: configuration.substrateNodeUri,
      proverServerUri: configuration.proverServerUri,
    },
  };
}
