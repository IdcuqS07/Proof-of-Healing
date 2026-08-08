import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    },
    midnight: undefined,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

function laceLike(): InitialAPI {
  const connected = {
    hintUsage: vi.fn(async () => undefined),
    getShieldedAddresses: async () => ({
      shieldedAddress: "mn_shield-addr_test1real",
      shieldedCoinPublicKey: "cpk",
      shieldedEncryptionPublicKey: "epk",
    }),
    getShieldedBalances: async () => ({ tDUST: 3_000_000n, OTHER: 500n }),
    getConfiguration: async () => ({
      indexerUri: "https://indexer.testnet/api/v4/graphql",
      indexerWsUri: "wss://indexer.testnet/api/v4/graphql/ws",
      proverServerUri: "http://localhost:6300",
      substrateNodeUri: "https://rpc.testnet",
      networkId: "testnet",
    }),
  };

  return {
    rdns: "io.lace.midnight",
    name: "Lace",
    icon: "data:image/png;base64,",
    apiVersion: "4.0.1",
    connect: vi.fn(async () => connected),
  } as unknown as InitialAPI;
}

describe("wallet connector", () => {
  it("creates a local development wallet when no extension is injected", async () => {
    const { connectWallet, hasNativeWallet } = await import("../src/lib/wallet");

    expect(hasNativeWallet()).toBe(false);
    const wallet = await connectWallet();
    expect(wallet).toMatchObject({ native: false, balance: 25_000_000 });
    expect(wallet.address).toMatch(/^mn_shield-addr_test1/);
  });

  it("reuses the stored development wallet on reconnect", async () => {
    const { connectWallet } = await import("../src/lib/wallet");

    const first = await connectWallet();
    const second = await connectWallet();
    expect(second.address).toBe(first.address);
  });

  it("connects through the DApp Connector API and sums shielded balances", async () => {
    const lace = laceLike();
    window.midnight = { "io.lace.midnight": lace };

    const { connectWallet, hasNativeWallet } = await import("../src/lib/wallet");
    expect(hasNativeWallet()).toBe(true);

    const wallet = await connectWallet();
    expect(lace.connect).toHaveBeenCalledWith("preview");
    expect(wallet).toMatchObject({
      address: "mn_shield-addr_test1real",
      balance: 3_000_500,
      network: "testnet",
      native: true,
      walletName: "Lace",
    });
    expect(wallet.services?.proverServerUri).toBe("http://localhost:6300");
  });

  it("ignores injected objects that do not implement connect()", async () => {
    window.midnight = { broken: {} as InitialAPI };

    const { connectWallet, hasNativeWallet } = await import("../src/lib/wallet");
    expect(hasNativeWallet()).toBe(false);
    expect((await connectWallet()).native).toBe(false);
  });

  it("credits and debits the development wallet without losing precision", async () => {
    const { connectWallet, adjustMockWalletBalance } = await import("../src/lib/wallet");

    await connectWallet();
    expect(adjustMockWalletBalance(-1_000_000)?.balance).toBe(24_000_000);
    expect(adjustMockWalletBalance(1_000_000)?.balance).toBe(25_000_000);
  });
});
