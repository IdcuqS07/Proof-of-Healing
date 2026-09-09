import { mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

/**
 * Reads MIDNIGHT_WALLET_SEED and normalises it to a hex seed. Both a raw hex
 * seed and a BIP39 mnemonic (as exported by Lace) are accepted.
 */
export function seedFromEnv(): string {
  const value = process.env.MIDNIGHT_WALLET_SEED?.trim();
  if (!value) {
    throw new Error("MIDNIGHT_WALLET_SEED is not set");
  }
  if (/^[0-9a-fA-F]+$/.test(value)) {
    return value.toLowerCase();
  }
  const mnemonic = value.replace(/\s+/g, " ").toLowerCase();
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new Error(
      "MIDNIGHT_WALLET_SEED must be a hex seed (no 0x prefix) or a valid BIP39 mnemonic",
    );
  }
  return Buffer.from(mnemonicToSeedSync(mnemonic)).toString("hex");
}
