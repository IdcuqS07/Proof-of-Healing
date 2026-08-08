import { afterEach, describe, expect, it, vi } from "vitest";
import { proofServerStatus } from "../src/lib/midnight/proof-server";

const URL = "http://localhost:6300";

function mockServer(routes: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input).replace(URL, "");
    if (!(path in routes)) return new Response("not found", { status: 404 });
    const body = routes[path];
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 200 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("proof server client", () => {
  it("returns null when no proof server is configured", async () => {
    expect(await proofServerStatus(undefined)).toBeNull();
  });

  it("reports version and queue depth from a healthy server", async () => {
    vi.stubGlobal(
      "fetch",
      mockServer({
        "/health": { status: "ok", timestamp: "2026-08-08 14:44:04" },
        "/version": "8.1.0",
        "/ready": { status: "ok", jobsProcessing: 0, jobsPending: 2 },
      }),
    );

    expect(await proofServerStatus(URL)).toEqual({
      url: URL,
      reachable: true,
      version: "8.1.0",
      jobsProcessing: 0,
      jobsPending: 2,
    });
  });

  it("stays reachable when the optional endpoints are missing", async () => {
    vi.stubGlobal("fetch", mockServer({ "/health": { status: "ok" } }));

    const status = await proofServerStatus(URL);
    expect(status).toMatchObject({ reachable: true, version: undefined });
  });

  it("marks a server that fails its health probe as unreachable", async () => {
    vi.stubGlobal("fetch", mockServer({ "/health": { status: "degraded" } }));

    expect(await proofServerStatus(URL)).toMatchObject({
      reachable: false,
      detail: "health: degraded",
    });
  });

  it("marks a server that cannot be contacted as unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connect ECONNREFUSED");
      }),
    );

    expect(await proofServerStatus(URL)).toMatchObject({
      reachable: false,
      detail: "connect ECONNREFUSED",
    });
  });
});
