import { sha256, toHex } from "./crypto";

export interface PowResult {
  nonce: number;
  digest: string;
  attempts: number;
  durationMs: number;
}

/** Default difficulty, tuned so a browser spends roughly 3–5 seconds (FR-1.2). */
export const DEFAULT_POW_DIFFICULTY = 5;

function hasLeadingZeroNibbles(digest: string, difficulty: number): boolean {
  return digest.startsWith("0".repeat(difficulty));
}

/**
 * Client side proof-of-work: find a nonce such that
 * `sha256(challenge || nonce)` starts with `difficulty` zero nibbles.
 */
export async function solveProofOfWork(
  challenge: string,
  difficulty: number = DEFAULT_POW_DIFFICULTY,
  onProgress?: (attempts: number) => void,
): Promise<PowResult> {
  const startedAt = Date.now();
  let nonce = 0;

  for (;;) {
    const digest = toHex(await sha256(`${challenge}:${nonce}`));
    if (hasLeadingZeroNibbles(digest, difficulty)) {
      return { nonce, digest, attempts: nonce + 1, durationMs: Date.now() - startedAt };
    }
    nonce += 1;
    if (onProgress && nonce % 500 === 0) {
      onProgress(nonce);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

export async function verifyProofOfWork(
  challenge: string,
  result: Pick<PowResult, "nonce">,
  difficulty: number = DEFAULT_POW_DIFFICULTY,
): Promise<boolean> {
  const digest = toHex(await sha256(`${challenge}:${result.nonce}`));
  return hasLeadingZeroNibbles(digest, difficulty);
}
