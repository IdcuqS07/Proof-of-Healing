/**
 * Thin client for the Midnight proof server (default port 6300).
 *
 * The server only exposes `/health`, `/version`, `/ready` plus the binary
 * `/check` and `/prove` endpoints that take a serialised unproven transaction.
 * Building that payload requires a deployed contract address and the wallet's
 * signing keys, so the app probes the server here and reports its state; the
 * transaction-level proving path is wired through `@midnight-ntwrk/midnight-js`
 * once a contract address is configured.
 */
export interface ProofServerStatus {
  url: string;
  reachable: boolean;
  version?: string;
  jobsPending?: number;
  jobsProcessing?: number;
  detail?: string;
}

export const PROOF_SERVER_URL = process.env.NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER;

async function getText(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url} → ${response.status}`);
  return (await response.text()).trim();
}

export async function proofServerStatus(
  url: string | undefined = PROOF_SERVER_URL,
  timeoutMs = 2_000,
): Promise<ProofServerStatus | null> {
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const health = JSON.parse(await getText(`${url}/health`, controller.signal)) as {
      status?: string;
    };
    if (health.status !== "ok") {
      return { url, reachable: false, detail: `health: ${health.status ?? "unknown"}` };
    }

    const version = await getText(`${url}/version`, controller.signal).catch(() => undefined);
    const ready = await getText(`${url}/ready`, controller.signal)
      .then((body) => JSON.parse(body) as { jobsPending?: number; jobsProcessing?: number })
      .catch(() => undefined);

    return {
      url,
      reachable: true,
      version,
      jobsPending: ready?.jobsPending,
      jobsProcessing: ready?.jobsProcessing,
    };
  } catch (error) {
    return { url, reachable: false, detail: error instanceof Error ? error.message : "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
