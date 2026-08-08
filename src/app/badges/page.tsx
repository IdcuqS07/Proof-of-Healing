"use client";

import Link from "next/link";
import { useApp } from "@/state/app-provider";
import { Badge, Button, Card, Mono, Stat } from "@/components/ui";
import { MILESTONES } from "@/lib/types";

export default function BadgesPage() {
  const { ready, account, badges, streak, proofs, busy, claimMilestone } = useApp();

  if (!ready) return <p className="text-slate-500">Memuat…</p>;

  if (!account) {
    return (
      <Card title="Belum terdaftar">
        <Link href="/" className="text-sm text-emerald-400 hover:underline">
          ← Daftar dulu di beranda
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Streak saat ini" value={`${streak} hari`} />
        <Stat label="Bukti harian on-chain" value={proofs.length} />
        <Stat
          label="Micro-bond"
          value={account.stakedAmount > 0 ? "Terkunci" : "Dikembalikan"}
          hint={account.refundedAt ? `Refund ${account.refundedAt.slice(0, 10)}` : undefined}
        />
      </div>

      <Card
        title="Milestone ZK Badge"
        subtitle="Kontrak hanya memverifikasi streak ≥ target: tanggal, nama kebiasaan, dan isi jurnal tetap rahasia."
      >
        <ul className="space-y-3">
          {MILESTONES.map((milestone) => {
            const owned = badges.find((badge) => badge.requiredDays === milestone);
            const eligible = streak >= milestone && proofs.length >= milestone;
            return (
              <li
                key={milestone}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-semibold text-slate-100">{milestone} Hari Streak</span>
                  {owned ? <Badge tone="emerald">Badge dimiliki</Badge> : null}
                  {!owned && eligible ? <Badge tone="amber">Siap diklaim</Badge> : null}
                  {!owned && !eligible ? (
                    <Badge>
                      {streak < milestone
                        ? `${milestone - streak} hari lagi`
                        : `butuh ${milestone - proofs.length} bukti on-chain lagi`}
                    </Badge>
                  ) : null}
                  <Button
                    className="ml-auto"
                    data-testid={`claim-${milestone}`}
                    onClick={() => void claimMilestone(milestone)}
                    disabled={!!owned || !eligible || busy === "milestone"}
                  >
                    {owned
                      ? "Sudah diklaim"
                      : busy === "milestone"
                        ? "Membuat ZK Proof…"
                        : "Generate ZK Proof"}
                  </Button>
                </div>
                {owned ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Diklaim {owned.claimedAt.slice(0, 10)} · proof <Mono>{owned.proofId}</Mono>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
