import { Buffer } from "buffer";
import { createKeystore, HDWallet, Roles } from "@midnightntwrk/wallet-sdk";
import { getNetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { networkConfig } from "./config.mjs";
import { seedFromEnv } from "./seed.mjs";

/**
 * Prints the unshielded (NIGHT) addresses derived from MIDNIGHT_WALLET_SEED for
 * the first few accounts/indices, so a faucet payment can be matched to a key.
 */
function main(): void {
  const seed = seedFromEnv();
  setNetworkId(networkConfig(process.env.MIDNIGHT_NETWORK).networkId);

  const hd = HDWallet.fromSeed(Buffer.from(seed, "hex"));
  if (hd.type !== "seedOk") {
    throw new Error("Invalid MIDNIGHT_WALLET_SEED: expected a hex-encoded seed");
  }
  for (const account of [0, 1]) {
    for (const index of [0, 1, 2]) {
      const derived = hd.hdWallet
        .selectAccount(account)
        .selectRoles([Roles.NightExternal])
        .deriveKeysAt(index);
      if (derived.type !== "keysDerived") {
        throw new Error("Key derivation from the wallet seed failed");
      }
      const keystore = createKeystore(derived.keys[Roles.NightExternal], getNetworkId());
      console.log(`account=${account} index=${index} ${keystore.getBech32Address()}`);
    }
  }
  hd.hdWallet.clear();
}

main();
