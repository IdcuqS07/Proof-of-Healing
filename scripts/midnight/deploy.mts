import { WebSocket } from "ws";

(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;

import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { ttlOneHour } from "@midnight-ntwrk/midnight-js-utils";
import type { FinalizedTransaction } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type { UnboundTransaction } from "@midnight-ntwrk/midnight-js-types";
import { Contract as ProofOfHealingContract } from "../../contracts/build/contract/index.js";
import { networkConfig, proofServerUrl } from "./config.mjs";
import { buildWallet, ensureDust } from "./wallet.mjs";

type CircuitName =
  | "registerAndStake"
  | "verifyDailyHabit"
  | "verifyStreakMilestone"
  | "provePeerGroupAccess";

export type PohPrivateState = {
  readonly userSecretSeed: Uint8Array;
  readonly dailyCommitmentHash: Uint8Array;
  readonly blockTime: bigint;
  readonly streakLength: bigint;
  readonly requiredDays: bigint;
};

type PohContract = ProofOfHealingContract<PohPrivateState>;

/** Mirrors the (non-exported) compact-js compiled asset path requirement. */
type CompiledAssetsPath = { readonly compiledAssetsPath: string };

const PRIVATE_STATE_ID = "proofOfHealingPrivateState";
const BUILD_DIR = resolve(process.cwd(), "contracts/build");

const witnesses = {
  userSecretSeed: ({ privateState }: { privateState: PohPrivateState }) =>
    [privateState, privateState.userSecretSeed] as [PohPrivateState, Uint8Array],
  dailyCommitmentHash: ({ privateState }: { privateState: PohPrivateState }) =>
    [privateState, privateState.dailyCommitmentHash] as [PohPrivateState, Uint8Array],
  blockTime: ({ privateState }: { privateState: PohPrivateState }) =>
    [privateState, privateState.blockTime] as [PohPrivateState, bigint],
  streakLength: ({ privateState }: { privateState: PohPrivateState }) =>
    [privateState, privateState.streakLength] as [PohPrivateState, bigint],
  requiredDays: ({ privateState }: { privateState: PohPrivateState }) =>
    [privateState, privateState.requiredDays] as [PohPrivateState, bigint],
};

/**
 * The private state store is encrypted at rest, so the password is derived from
 * the wallet seed rather than hardcoded, and never leaves this process.
 */
function privateStatePassword(seedHex: string): string {
  const digest = createHash("sha256").update(`poh-private-state:${seedHex}`).digest("hex");
  return `Poh-${digest.slice(0, 24)}!`;
}

function seedFromEnv(): string {
  const seed = process.env.MIDNIGHT_WALLET_SEED?.trim();
  if (!seed) {
    throw new Error("MIDNIGHT_WALLET_SEED is not set");
  }
  if (!/^[0-9a-fA-F]+$/.test(seed)) {
    throw new Error("MIDNIGHT_WALLET_SEED must be hex-encoded (no spaces, no 0x prefix)");
  }
  return seed.toLowerCase();
}

async function main(): Promise<void> {
  const config = networkConfig(process.env.MIDNIGHT_NETWORK);
  setNetworkId(config.networkId);

  const seed = seedFromEnv();
  const ctx = await buildWallet(seed, config);
  console.log(`Network: ${config.networkId}`);
  console.log(`Wallet address: ${ctx.unshieldedAddress}`);

  try {
    await ensureDust(ctx);

    const zkConfigProvider = new NodeZkConfigProvider<CircuitName>(BUILD_DIR);
    const walletAndMidnightProvider = {
      getCoinPublicKey: () => ctx.shieldedSecretKeys.coinPublicKey,
      getEncryptionPublicKey: () => ctx.shieldedSecretKeys.encryptionPublicKey,
      balanceTx: async (tx: UnboundTransaction, ttl: Date = ttlOneHour()): Promise<FinalizedTransaction> => {
        const recipe = await ctx.wallet.balanceUnboundTransaction(
          tx,
          { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
          { ttl },
        );
        return await ctx.wallet.finalizeRecipe(recipe);
      },
      submitTx: (tx: FinalizedTransaction): Promise<string> => ctx.wallet.submitTransaction(tx),
    };

    const providers = {
      privateStateProvider: levelPrivateStateProvider<typeof PRIVATE_STATE_ID, PohPrivateState>({
        privateStateStoreName: "poh-private-state",
        signingKeyStoreName: "poh-signing-keys",
        privateStoragePasswordProvider: () => privateStatePassword(seed),
        accountId: ctx.unshieldedAddress,
      }),
      publicDataProvider: indexerPublicDataProvider(config.indexerHttpUrl, config.indexerWsUrl),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(proofServerUrl(), zkConfigProvider),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider,
    };

    const compiled = CompiledContract.withCompiledFileAssets<
      PohContract,
      PohPrivateState,
      CompiledAssetsPath
    >(
      CompiledContract.withWitnesses(
        CompiledContract.make<PohContract, PohPrivateState>(
          "proof-of-healing",
          ProofOfHealingContract,
        ),
        witnesses,
      ),
      BUILD_DIR,
    );

    const initialPrivateState: PohPrivateState = {
      userSecretSeed: new Uint8Array(32),
      dailyCommitmentHash: new Uint8Array(32),
      blockTime: 0n,
      streakLength: 0n,
      requiredDays: 0n,
    };

    console.log("Deploying ProofOfHealingNative...");
    const deployed = await deployContract(providers, {
      compiledContract: compiled,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState,
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;
    const record = {
      network: config.networkId,
      contractAddress,
      txId: deployed.deployTxData.public.txId,
      blockHeight: deployed.deployTxData.public.blockHeight,
      deployedAt: new Date().toISOString(),
    };
    const outFile = resolve(process.cwd(), `deployments/${config.networkId}.json`);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, `${JSON.stringify(record, null, 2)}\n`);

    console.log(`Contract address: ${contractAddress}`);
    console.log(`Deployment written to ${outFile}`);
  } finally {
    await ctx.wallet.stop();
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
