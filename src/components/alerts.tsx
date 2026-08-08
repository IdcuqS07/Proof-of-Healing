"use client";

import { useApp } from "@/state/app-provider";

export function Alerts() {
  const { error, notice, busy, powAttempts, dismiss } = useApp();

  if (!error && !notice && !busy) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      {busy ? (
        <div
          data-testid="busy-banner"
          className="mb-2 rounded-lg border border-sky-800 bg-sky-950/60 px-4 py-2 text-sm text-sky-200"
        >
          {busy === "register" || busy === "proof"
            ? `Menjalankan Proof-of-Work di peramban… (${powAttempts.toLocaleString("id-ID")} percobaan)`
            : "Memproses…"}
        </div>
      ) : null}
      {error ? (
        <button
          data-testid="error-banner"
          onClick={dismiss}
          className="mb-2 block w-full rounded-lg border border-rose-800 bg-rose-950/60 px-4 py-2 text-left text-sm text-rose-200"
        >
          {error}
        </button>
      ) : null}
      {notice ? (
        <button
          data-testid="notice-banner"
          onClick={dismiss}
          className="mb-2 block w-full rounded-lg border border-emerald-800 bg-emerald-950/60 px-4 py-2 text-left text-sm text-emerald-200"
        >
          {notice}
        </button>
      ) : null}
    </div>
  );
}
