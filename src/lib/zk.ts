import { sha256, toHex } from "./crypto";
import type { PowResult } from "./pow";

export interface ZkProof {
  /** Circuit the proof was produced for. */
  circuit: "registerAndStake" | "verifyDailyHabit" | "verifyStreakMilestone" | "provePeerGroupAccess";
  /** Public inputs — deliberately free of any journal content. */
  publicInputs: Record<string, string | number>;
  /** Opaque proof bytes. Produced by the Midnight prover when it is available. */
  proof: string;
  proofId: string;
  generatedAt: string;
  /** Set when the proof came from the local simulator instead of a proof server. */
  simulated: boolean;
}

const PROOF_SERVER_URL = process.env.NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER;

/**
 * Builds a proof for a circuit. Custom circuits use local simulator
 * (proof server only supports Midnight built-in circuits like Zswap).
 * Blockchain transactions use real Midnight network via Lace Wallet.
 */
export async function generateProof(
  circuit: ZkProof["circuit"],
  publicInputs: Record<string, string | number>,
  privateWitness: Record<string, string | number>,
  pow?: PowResult,
): Promise<ZkProof> {
  const generatedAt = new Date().toISOString();

  // Note: Midnight proof server only supports built-in circuits (Zswap, Dust spends)
  // Custom circuits (registerAndStake, verifyDailyHabit, etc.) use local simulator
  // Blockchain transactions still use real Midnight network via Lace Wallet
  const commitment = toHex(
    await sha256(JSON.stringify({ circuit, publicInputs, privateWitness, pow: pow?.digest })),
  );
  return {
    circuit,
    publicInputs,
    proof: `zkp_sim_${commitment}`,
    proofId: commitment.slice(0, 32),
    generatedAt,
    simulated: true,
  };
}
