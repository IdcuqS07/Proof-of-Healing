import { sha256, toHex } from "./crypto";
import { PROOF_SERVER_URL, proofServerStatus } from "./midnight/proof-server";
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
  /** Version reported by the proof server, when one is reachable. */
  proofServerVersion?: string;
}

/**
 * Builds a proof for a circuit.
 *
 * When `NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER` is set the server must answer its health
 * probe, otherwise proving fails loudly instead of silently degrading. Real
 * transaction-level proving (`/check` + `/prove`) additionally needs a deployed
 * contract address and a wallet that can serialise an unproven transaction, so
 * until that is configured the proof is derived locally and flagged as simulated
 * everywhere it is displayed or stored.
 */
export async function generateProof(
  circuit: ZkProof["circuit"],
  publicInputs: Record<string, string | number>,
  privateWitness: Record<string, string | number>,
  pow?: PowResult,
): Promise<ZkProof> {
  const generatedAt = new Date().toISOString();

  const server = PROOF_SERVER_URL ? await proofServerStatus() : null;
  if (PROOF_SERVER_URL && !server?.reachable) {
    throw new Error(
      `proof server ${PROOF_SERVER_URL} is not reachable${server?.detail ? `: ${server.detail}` : ""}`,
    );
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
    proofServerVersion: server?.version,
  };
}
