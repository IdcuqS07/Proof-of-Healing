"use client";

import Link from "next/link";
import { useApp } from "@/state/app-provider";
import { Badge, Button, Card, Mono, Stat } from "@/components/ui";
import { STAKE_AMOUNT } from "@/lib/contract/simulator";

const STEPS = [
  {
    title: "1. Connect wallet & register anonymously",
    body: "Micro-bonding locks a small testnet token deposit as proof you're human. Deposit is fully refunded when milestone is achieved.",
  },
  {
    title: "2. Track daily habits locally",
    body: "Journal, mood, and habit status are stored AES-256-GCM encrypted in your device's IndexedDB. No server receives this data.",
  },
  {
    title: "3. Submit daily proof",
    body: "Browser runs lightweight Proof-of-Work, then Compact contract verifies 18-hour gap between entries to reject bots.",
  },
  {
    title: "4. Claim ZK Badge",
    body: "Prove streak ≥ target without revealing dates or entry contents. Badge is issued anonymously and deposit is refunded.",
  },
  {
    title: "5. Join Anonymous Peer Group",
    body: "ZK Badge becomes your ticket to anonymous support group, without name, photo, or social identity.",
  },
];

export default function HomePage() {
  const { ready, wallet, account, connect, register, busy, streak, badges } = useApp();

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <Badge tone="emerald">Zero-Knowledge · Midnight Network</Badge>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          Prove your recovery consistency without revealing a single personal note.
        </h1>
        <p className="max-w-3xl text-slate-400">
          Proof of Healing stores mental health journal entirely on your device and only sends
          mathematical proof to Midnight network: enough to prove habit streak, not enough to know anything about you.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Current streak" value={ready ? `${streak} days` : "…"} />
        <Stat label="ZK Badges owned" value={ready ? badges.length : "…"} />
        <Stat
          label="Micro-bond"
          value={`${(STAKE_AMOUNT / 1_000_000).toFixed(2)} tDUST`}
          hint="Refunded after milestone"
        />
      </div>

      <Card
        title="Get started here"
        subtitle="Two setup steps; the rest runs on your device."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void connect()} disabled={!!wallet || busy === "connect"}>
            {wallet ? "Wallet connected" : busy === "connect" ? "Connecting…" : "Connect Wallet"}
          </Button>
          <Button
            data-testid="register-button"
            onClick={() => void register()}
            disabled={!wallet || !!account || busy === "register"}
            variant={account ? "ghost" : "primary"}
          >
            {account
              ? "Already registered"
              : busy === "register"
                ? "Running PoW & staking…"
                : "Register & Stake Deposit"}
          </Button>
          {account ? (
            <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline">
              Open Dashboard →
            </Link>
          ) : null}
        </div>
        {wallet ? (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Wallet address (shielded)</dt>
              <dd>
                <Mono>{wallet.address}</Mono>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Network</dt>
              <dd className="text-slate-300">{wallet.network}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Balance</dt>
              <dd className="text-slate-300">{(wallet.balance / 1_000_000).toFixed(3)} tDUST</dd>
            </div>
            {wallet.unshieldedAddress ? (
              <div>
                <dt className="text-slate-500">Faucet address (unshielded)</dt>
                <dd>
                  <Mono>{wallet.unshieldedAddress}</Mono>
                </dd>
              </div>
            ) : null}
            {account ? (
              <div>
                <dt className="text-slate-500">Anonymous on-chain commitment</dt>
                <dd>
                  <Mono>{account.commitment}</Mono>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Don&apos;t have Lace Wallet? App automatically uses local development wallet
            so entire flow can still be tested.
          </p>
        )}
      </Card>

      <Card title="Quick guide" subtitle="Proof of Healing User Guide summary.">
        <ol className="space-y-3">
          {STEPS.map((step) => (
            <li key={step.title} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="font-medium text-slate-200">{step.title}</p>
              <p className="mt-1 text-sm text-slate-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
