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
 * Builds a proof for a circuit. When `NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER` points
 * at a running Midnight proof server the witness is sent there; otherwise the
 * proof is derived locally so the flow — including the PoW gate — stays intact
 * without the dev container.
 */
export async function generateProof(
  circuit: ZkProof["circuit"],
  publicInputs: Record<string, string | number>,
  privateWitness: Record<string, string | number>,
  pow?: PowResult,
): Promise<ZkProof> {
  const generatedAt = new Date().toISOString();

  if (PROOF_SERVER_URL) {
    const response = await fetch(`${PROOF_SERVER_URL}/prove`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ circuit, publicInputs, privateWitness }),
    });
    if (!response.ok) throw new Error(`proof server rejected the witness: ${response.status}`);
    const { proof } = (await response.json()) as { proof: string };
    return {
      circuit,
      publicInputs,
      proof,
      proofId: toHex(await sha256(proof)).slice(0, 32),
      generatedAt,
      simulated: false,
    };
  }

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
