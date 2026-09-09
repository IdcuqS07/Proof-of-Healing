import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Ledger, Witnesses } from "./build/contract/index.js";

/**
 * Private state kept off-chain by the deployer CLI. Mirrors the witness list in
 * `contracts/src/ProofOfHealingNative.compact`; every value is fed to the
 * circuit through a witness so nothing here ever reaches the ledger.
 */
export interface ProofOfHealingPrivateState {
  userSecretSeed: Uint8Array;
  dailyCommitmentHash: Uint8Array;
  blockTime: bigint;
  streakLength: bigint;
  requiredDays: bigint;
}

export const emptyPrivateState = (): ProofOfHealingPrivateState => ({
  userSecretSeed: new Uint8Array(32),
  dailyCommitmentHash: new Uint8Array(32),
  blockTime: 0n,
  streakLength: 0n,
  requiredDays: 0n,
});

type Ctx = WitnessContext<Ledger, ProofOfHealingPrivateState>;

export const witnesses: Witnesses<ProofOfHealingPrivateState> = {
  userSecretSeed: ({ privateState }: Ctx) => [privateState, privateState.userSecretSeed],
  dailyCommitmentHash: ({ privateState }: Ctx) => [privateState, privateState.dailyCommitmentHash],
  blockTime: ({ privateState }: Ctx) => [privateState, privateState.blockTime],
  streakLength: ({ privateState }: Ctx) => [privateState, privateState.streakLength],
  requiredDays: ({ privateState }: Ctx) => [privateState, privateState.requiredDays],
};
