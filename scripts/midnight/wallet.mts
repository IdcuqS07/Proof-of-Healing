import { Buffer } from "buffer";
import * as Rx from "rxjs";
import {
  createKeystore,
  DustAddress,
  DustWallet,
  HDWallet,
  MidnightBech32m,
  NoOpTransactionHistoryStorage,
  PublicKey,
  Roles,
  ShieldedWallet,
  UnshieldedWallet,
  WalletFacade,
} from "@midnightntwrk/wallet-sdk";
import * as ledger from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { unshieldedToken } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { formatDust, formatNight, proofServerUrl, type NetworkConfig } from "./config.mjs";

type Keystore = ReturnType<typeof createKeystore>;

export interface WalletContext {
  readonly wallet: WalletFacade;
  readonly shieldedSecretKeys: ledger.ZswapSecretKeys;
  readonly dustSecretKey: ledger.DustSecretKey;
  readonly keystore: Keystore;
  readonly unshieldedAddress: string;
}

function deriveKeys(seedHex: string) {
  const hd = HDWallet.fromSeed(Buffer.from(seedHex, "hex"));
  if (hd.type !== "seedOk") {
    throw new Error("Invalid MIDNIGHT_WALLET_SEED: expected a hex-encoded seed");
  }
  const derived = hd.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  hd.hdWallet.clear();
  if (derived.type !== "keysDerived") {
    throw new Error("Key derivation from the wallet seed failed");
  }
  return derived.keys;
}

/** Builds and starts the three sub-wallets behind a `WalletFacade`. */
export async function buildWallet(seedHex: string, config: NetworkConfig): Promise<WalletContext> {
  const keys = deriveKeys(seedHex);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());

  const indexerClientConnection = {
    indexerHttpUrl: config.indexerHttpUrl,
    indexerWsUrl: config.indexerWsUrl,
  };
  const shieldedConfig = {
    networkId: getNetworkId(),
    indexerClientConnection,
    provingServerUrl: new URL(proofServerUrl()),
    relayURL: new URL(config.node.replace(/^http/, "ws")),
  };
  const unshieldedConfig = {
    networkId: getNetworkId(),
    indexerClientConnection,
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
  };
  const dustConfig = {
    ...shieldedConfig,
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
  };

  const wallet = await WalletFacade.init({
    configuration: { ...shieldedConfig, ...unshieldedConfig, ...dustConfig },
    shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg) =>
      DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  return {
    wallet,
    shieldedSecretKeys,
    dustSecretKey,
    keystore: unshieldedKeystore,
    unshieldedAddress: String(unshieldedKeystore.getBech32Address()),
  };
}

/**
 * Registers every unregistered NIGHT UTXO for DUST generation and waits until
 * DUST accrues, so the deploy transaction can pay its fee.
 */
export async function ensureDust(ctx: WalletContext): Promise<bigint> {
  const { wallet, keystore } = ctx;

  const nightBalance = await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.map((state) => state.unshielded.balances[unshieldedToken().raw] ?? 0n),
      Rx.filter((balance) => balance > 0n),
    ),
  );
  console.log(`NIGHT balance: ${formatNight(nightBalance)}`);

  const state = await wallet.waitForSyncedState();
  if (state.dust.balance(new Date()) > 0n) {
    return state.dust.balance(new Date());
  }

  const unregistered = state.unshielded.availableCoins.filter(
    (coin) => coin.meta?.registeredForDustGeneration !== true,
  );
  if (unregistered.length > 0) {
    const target = String(DustAddress.encodePublicKey(getNetworkId(), state.dust.publicKey));
    const dustReceiver = MidnightBech32m.parse(target).decode(DustAddress, getNetworkId());
    const recipe = await wallet.registerNightUtxosForDustGeneration(
      unregistered,
      keystore.getPublicKey(),
      (payload) => keystore.signData(payload),
      dustReceiver,
    );
    const finalized = await wallet.finalizeRecipe(recipe);
    await wallet.submitTransaction(finalized);
    console.log(`Registered ${unregistered.length} NIGHT UTXO(s) for DUST generation`);
  }

  await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.filter((s) => s.isSynced),
      Rx.filter((s) => s.dust.balance(new Date()) > 0n),
    ),
  );
  const dust = (await Rx.firstValueFrom(wallet.state())).dust.balance(new Date());
  console.log(`DUST balance: ${formatDust(dust)}`);
  return dust;
}
