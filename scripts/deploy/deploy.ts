import path from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
import * as Rx from "rxjs";
import { WebSocket } from "ws";
import * as ledger from "@midnight-ntwrk/ledger-v8";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { deployContract } from "@midnight-ntwrk/midnight-js/contracts";
import { getNetworkId, setNetworkId, type NetworkId } from "@midnight-ntwrk/midnight-js/network-id";
import type { MidnightProvider, WalletProvider } from "@midnight-ntwrk/midnight-js/types";
import { toHex } from "@midnight-ntwrk/midnight-js/utils";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { WalletFacade, WalletEntrySchema, mergeWalletEntries } from "@midnight-ntwrk/wallet-sdk-facade";
import { DustWallet } from "@midnight-ntwrk/wallet-sdk-dust-wallet";
import { HDWallet, Roles, generateRandomSeed } from "@midnight-ntwrk/wallet-sdk-hd";
import { ShieldedWallet } from "@midnight-ntwrk/wallet-sdk-shielded";
import { InMemoryTransactionHistoryStorage } from "@midnight-ntwrk/wallet-sdk-abstractions";
import {
  createKeystore,
  PublicKey,
  UnshieldedWallet,
  type UnshieldedKeystore,
} from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import { Contract, ledger as ledgerState } from "./build/contract/index.js";
import { emptyPrivateState, witnesses, type ProofOfHealingPrivateState } from "./witnesses.js";

// Apollo (indexer subscriptions) needs a global WebSocket in Node.
// @ts-expect-error Node has no global WebSocket of the expected type
globalThis.WebSocket = WebSocket;

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const zkConfigPath = path.resolve(here, "build");
const deploymentFile = path.resolve(repoRoot, "contracts", "deployment.json");
const privateStateStore = path.resolve(here, ".private-state");

type Network = "undeployed" | "preview" | "preprod";

interface NetworkConfig {
  networkId: NetworkId;
  indexer: string;
  indexerWS: string;
  node: string;
  faucet?: string;
}

const NETWORKS: Record<Network, NetworkConfig> = {
  undeployed: {
    networkId: "undeployed",
    indexer: "http://127.0.0.1:8088/api/v3/graphql",
    indexerWS: "ws://127.0.0.1:8088/api/v3/graphql/ws",
    node: "http://127.0.0.1:9944",
  },
  preview: {
    networkId: "preview",
    indexer: "https://indexer.preview.midnight.network/api/v3/graphql",
    indexerWS: "wss://indexer.preview.midnight.network/api/v3/graphql/ws",
    node: "https://rpc.preview.midnight.network",
    faucet: "https://faucet.preview.midnight.network/",
  },
  preprod: {
    networkId: "preprod",
    indexer: "https://indexer.preprod.midnight.network/api/v3/graphql",
    indexerWS: "wss://indexer.preprod.midnight.network/api/v3/graphql/ws",
    node: "https://rpc.preprod.midnight.network",
    faucet: "https://faucet.preprod.midnight.network/",
  },
};

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`missing env ${name}`);
  return value;
}

const network = env("MIDNIGHT_NETWORK", "preprod") as Network;
if (!(network in NETWORKS)) throw new Error(`MIDNIGHT_NETWORK must be one of ${Object.keys(NETWORKS).join(", ")}`);
const config = {
  ...NETWORKS[network],
  indexer: process.env.MIDNIGHT_INDEXER_URL ?? NETWORKS[network].indexer,
  indexerWS: process.env.MIDNIGHT_INDEXER_WS_URL ?? NETWORKS[network].indexerWS,
  node: process.env.MIDNIGHT_NODE_URL ?? NETWORKS[network].node,
  proofServer: env("MIDNIGHT_PROOF_SERVER", "http://127.0.0.1:6300"),
};
setNetworkId(config.networkId);

const DIV = "──────────────────────────────────────────────────────────────";

const withStatus = async <T,>(message: string, fn: () => Promise<T>): Promise<T> => {
  process.stdout.write(`  … ${message}`);
  try {
    const result = await fn();
    process.stdout.write(`\r  ✓ ${message}\n`);
    return result;
  } catch (e) {
    process.stdout.write(`\r  ✗ ${message}\n`);
    throw e;
  }
};

const deriveKeysFromSeed = (seedHex: string) => {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seedHex, "hex"));
  if (hdWallet.type !== "seedOk") throw new Error("invalid wallet seed (expected 64 hex chars)");
  const derived = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derived.type !== "keysDerived") throw new Error("failed to derive wallet keys");
  hdWallet.hdWallet.clear();
  return derived.keys;
};

interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

const walletConfiguration = () => {
  const indexerClientConnection = { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWS };
  const relayURL = new URL(config.node.replace(/^http/, "ws"));
  const provingServerUrl = new URL(config.proofServer);
  return {
    networkId: getNetworkId(),
    indexerClientConnection,
    relayURL,
    provingServerUrl,
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  };
};

const buildWallet = async (seedHex: string): Promise<WalletContext> => {
  const keys = deriveKeysFromSeed(seedHex);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());

  const wallet = await WalletFacade.init({
    configuration: walletConfiguration(),
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) => DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
};

const syncedState = (wallet: WalletFacade) =>
  Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));

const nightBalance = (state: Awaited<ReturnType<typeof syncedState>>) =>
  state.unshielded.balances[ledger.unshieldedToken().raw] ?? 0n;

const ensureDust = async ({ wallet, unshieldedKeystore }: WalletContext) => {
  const state = await syncedState(wallet);
  if (state.dust.availableCoins.length > 0 && state.dust.balance(new Date()) > 0n) {
    console.log(`  ✓ DUST available (${state.dust.balance(new Date()).toLocaleString()})`);
    return;
  }
  const unregistered = state.unshielded.availableCoins.filter(
    (coin) => coin.meta?.registeredForDustGeneration !== true,
  );
  if (unregistered.length > 0) {
    await withStatus(`Registering ${unregistered.length} NIGHT UTXO(s) for DUST generation`, async () => {
      const recipe = await wallet.registerNightUtxosForDustGeneration(
        unregistered,
        unshieldedKeystore.getPublicKey(),
        (payload) => unshieldedKeystore.signData(payload),
      );
      await wallet.submitTransaction(await wallet.finalizeRecipe(recipe));
    });
  }
  await withStatus("Waiting for DUST to accrue (fee resource)", () =>
    Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.throttleTime(5_000),
        Rx.filter((s) => s.isSynced && s.dust.balance(new Date()) > 0n),
      ),
    ),
  );
};

/** Sign every unshielded offer in a tx's intents with the right proof marker. */
const signIntents = (
  tx: { intents?: Map<number, ledger.Intent<ledger.SignatureEnabled, ledger.Proofish, ledger.PreBinding>> },
  sign: (payload: Uint8Array) => ledger.Signature,
  proofMarker: "proof" | "pre-proof",
) => {
  if (!tx.intents) return;
  for (const [segment, intent] of tx.intents) {
    const cloned = ledger.Intent.deserialize<ledger.SignatureEnabled, ledger.Proofish, ledger.PreBinding>(
      "signature",
      proofMarker,
      "pre-binding",
      intent.serialize(),
    );
    const signature = sign(cloned.signatureData(segment));
    for (const key of ["fallibleUnshieldedOffer", "guaranteedUnshieldedOffer"] as const) {
      const offer = cloned[key];
      if (!offer) continue;
      cloned[key] = offer.addSignatures(offer.inputs.map((_, i) => offer.signatures.at(i) ?? signature));
    }
    tx.intents.set(segment, cloned);
  }
};

const createProvider = async (ctx: WalletContext): Promise<WalletProvider & MidnightProvider> => {
  const state = await syncedState(ctx.wallet);
  return {
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString(),
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString(),
    async balanceTx(tx, ttl) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const sign = (payload: Uint8Array) => ctx.unshieldedKeystore.signData(payload);
      signIntents(recipe.baseTransaction, sign, "proof");
      if (recipe.balancingTransaction) signIntents(recipe.balancingTransaction, sign, "pre-proof");
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx) => ctx.wallet.submitTransaction(tx),
  };
};

type PoHContract = Contract<ProofOfHealingPrivateState>;
const PRIVATE_STATE_ID = "proofOfHealingPrivateState";

const compiledContract = CompiledContract.make<PoHContract>("proof-of-healing", Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

async function main() {
  if (!existsSync(path.join(zkConfigPath, "contract", "index.js"))) {
    throw new Error(`compiled contract not found at ${zkConfigPath} — run \`npm run compile\` first`);
  }

  let seed = process.env.MIDNIGHT_WALLET_SEED;
  if (!seed) {
    seed = toHex(Buffer.from(generateRandomSeed()));
    console.log(`\n${DIV}\n  New wallet seed — save it, it will not be shown again:\n  ${seed}\n${DIV}`);
  }

  const ctx = await withStatus(`Building wallet (${network})`, () => buildWallet(seed));
  console.log(`\n  Unshielded address: ${ctx.unshieldedKeystore.getBech32Address()}`);
  if (config.faucet) console.log(`  Faucet:             ${config.faucet}\n`);

  let state = await withStatus("Syncing wallet with indexer", () => syncedState(ctx.wallet));
  if (nightBalance(state) === 0n) {
    state = await withStatus("Waiting for tNIGHT to arrive (fund the address above)", () =>
      Rx.firstValueFrom(
        ctx.wallet.state().pipe(Rx.throttleTime(10_000), Rx.filter((s) => s.isSynced && nightBalance(s) > 0n)),
      ),
    );
  }
  console.log(`  Balance: ${nightBalance(state).toLocaleString()} tNIGHT`);
  await ensureDust(ctx);

  const walletProvider = await createProvider(ctx);
  const zkConfigProvider = new NodeZkConfigProvider<never>(zkConfigPath);
  const accountId = walletProvider.getCoinPublicKey();
  mkdirSync(privateStateStore, { recursive: true });
  const providers = {
    privateStateProvider: levelPrivateStateProvider<typeof PRIVATE_STATE_ID, ProofOfHealingPrivateState>({
      midnightDbName: privateStateStore,
      privateStateStoreName: "proof-of-healing-private-state",
      accountId,
      privateStoragePasswordProvider: () => `${Buffer.from(accountId, "hex").toString("base64")}!`,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  const deployed = await withStatus("Deploying ProofOfHealingNative (proving + submitting)", () =>
    deployContract(providers, {
      compiledContract,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: emptyPrivateState(),
    }),
  );

  const { contractAddress, txId, blockHeight } = deployed.deployTxData.public;
  const record = {
    network,
    contractAddress,
    txId,
    blockHeight: Number(blockHeight),
    deployedAt: new Date().toISOString(),
    compactc: readFileSync(path.join(zkConfigPath, "compiler", "contract-info.json"), "utf8").match(
      /"compiler-version":\s*"([^"]+)"/,
    )?.[1],
  };
  writeFileSync(deploymentFile, JSON.stringify(record, null, 2) + "\n");

  const onChain = await providers.publicDataProvider.queryContractState(contractAddress);
  const publicState = onChain ? ledgerState(onChain.data) : null;

  console.log(`
${DIV}
  Deployed ProofOfHealingNative
${DIV}
  Network:          ${network}
  Contract address: ${contractAddress}
  Tx id:            ${txId}
  Block height:     ${blockHeight}
  totalRegistered:  ${publicState?.totalRegistered ?? "n/a"}
  Written to:       ${path.relative(repoRoot, deploymentFile)}

  Add to .env.local:
  NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}
${DIV}`);

  await ctx.wallet.stop();
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("\nDeployment failed:", e);
    process.exit(1);
  },
);
