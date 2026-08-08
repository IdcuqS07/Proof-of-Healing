"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/state/app-provider";
import { Badge, Button, Card, Mono, Stat, formatDuration } from "@/components/ui";
import { MILESTONES } from "@/lib/types";
import { nextMilestone, todayISO } from "@/lib/streak";

export default function DashboardPage() {
  const {
    ready,
    account,
    habits,
    entries,
    proofs,
    streak,
    best,
    today,
    cooldownRemaining,
    busy,
    addHabit,
    removeHabit,
    saveToday,
    submitDailyProof,
    wipe,
  } = useApp();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [target, setTarget] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [mood, setMood] = useState(3);
  const [journal, setJournal] = useState("");

  useEffect(() => {
    setChecked(today?.completedHabitIds ?? []);
    setMood(today?.mood ?? 3);
    setJournal(today?.journal ?? "");
  }, [today]);

  if (!ready) return <p className="text-slate-500">Memuat data lokal…</p>;

  if (!account) {
    return (
      <Card title="Belum terdaftar" subtitle="Selesaikan Langkah 1 di beranda terlebih dahulu.">
        <Link href="/" className="text-sm text-emerald-400 hover:underline">
          ← Kembali ke beranda untuk Connect Wallet & Register
        </Link>
      </Card>
    );
  }

  const provenToday = proofs.some((proof) => proof.date === todayISO());
  const upcoming = nextMilestone(streak, MILESTONES);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Streak saat ini" value={`${streak} hari`} />
        <Stat label="Streak terbaik" value={`${best} hari`} />
        <Stat label="Bukti on-chain" value={proofs.length} hint="Transaksi Compact" />
        <Stat
          label="Milestone berikutnya"
          value={upcoming ? `${upcoming} hari` : "Selesai"}
          hint={upcoming ? `${upcoming - streak} hari lagi` : "Semua badge tercapai"}
        />
      </div>

      <Card
        title="Kebiasaan yang dilacak"
        subtitle="Nama kebiasaan hanya tersimpan terenkripsi di perangkat ini."
      >
        <form
          className="grid gap-2 sm:grid-cols-[2fr,1fr,1fr,auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void addHabit({ name, category, target }).then(() => {
              setName("");
              setCategory("");
              setTarget("");
            });
          }}
        >
          <input
            aria-label="Nama kebiasaan"
            placeholder="Meditasi pagi"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            aria-label="Kategori"
            placeholder="Meditasi"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            aria-label="Target harian"
            placeholder="15 menit"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={busy === "habit"}>
            Tambah
          </Button>
        </form>

        <ul className="mt-4 space-y-2">
          {habits.length === 0 ? (
            <li className="text-sm text-slate-500">Belum ada kebiasaan. Tambahkan satu di atas.</li>
          ) : null}
          {habits.map((habit) => (
            <li
              key={habit.id}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
            >
              <span className="font-medium text-slate-200">{habit.name}</span>
              <Badge>{habit.category}</Badge>
              <span className="text-xs text-slate-500">{habit.target}</span>
              <Button
                variant="danger"
                className="ml-auto"
                onClick={() => void removeHabit(habit.id)}
                disabled={busy === "habit"}
              >
                Hapus
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title={`Catatan harian — ${todayISO()}`}
        subtitle="Disimpan lokal dengan AES-256-GCM. Hanya hash komitmen yang dipakai untuk bukti."
        footer={
          today ? (
            <p className="text-xs text-slate-500">
              Hash komitmen hari ini: <Mono>{today.commitmentHash}</Mono>
            </p>
          ) : null
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveToday({ completedHabitIds: checked, mood, journal });
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm text-slate-400">Kebiasaan selesai hari ini</legend>
            {habits.length === 0 ? (
              <p className="text-sm text-slate-500">Tambahkan kebiasaan terlebih dahulu.</p>
            ) : null}
            {habits.map((habit) => (
              <label key={habit.id} className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={checked.includes(habit.id)}
                  onChange={(event) =>
                    setChecked((previous) =>
                      event.target.checked
                        ? [...previous, habit.id]
                        : previous.filter((id) => id !== habit.id),
                    )
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                />
                {habit.name}
              </label>
            ))}
          </fieldset>

          <label className="block text-sm text-slate-400">
            Mood hari ini: <span className="text-slate-200">{mood}/5</span>
            <input
              type="range"
              min={1}
              max={5}
              value={mood}
              onChange={(event) => setMood(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>

          <label className="block text-sm text-slate-400">
            Jurnal emosi (opsional)
            <textarea
              rows={4}
              value={journal}
              onChange={(event) => setJournal(event.target.value)}
              placeholder="Tulis bebas — isi ini tidak pernah meninggalkan perangkat Anda."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy === "journal"}>
              Simpan catatan lokal
            </Button>
            <Button
              type="button"
              data-testid="submit-daily-proof"
              variant="ghost"
              onClick={() => void submitDailyProof()}
              disabled={busy === "proof" || cooldownRemaining > 0 || provenToday}
            >
              {busy === "proof" ? "Membuat bukti…" : "Submit Daily Proof"}
            </Button>
            {cooldownRemaining > 0 ? (
              <span className="text-xs text-amber-300">
                Cooldown kontrak: {formatDuration(cooldownRemaining)} lagi
              </span>
            ) : null}
            {provenToday ? (
              <Badge tone="emerald">Bukti hari ini sudah diterima</Badge>
            ) : null}
          </div>
        </form>
      </Card>

      <Card title="Riwayat bukti on-chain" subtitle="Yang tercatat di ledger hanyalah hash dan waktu.">
        {proofs.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada bukti yang dikirim.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {[...proofs].reverse().map((proof) => (
              <li
                key={proof.date}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-200">{proof.date}</span>
                  <Badge tone="emerald">PoW nonce {proof.powNonce.toLocaleString("id-ID")}</Badge>
                  <span className="text-xs text-slate-500">tx {proof.txId.slice(0, 18)}…</span>
                </div>
                <Mono>{proof.commitmentHash}</Mono>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Kontrol privasi"
        subtitle={`${entries.length} entri jurnal tersimpan terenkripsi di peramban ini.`}
      >
        <Button variant="danger" onClick={() => void wipe()} disabled={busy === "wipe"}>
          Hapus seluruh data lokal
        </Button>
      </Card>
    </div>
  );
}
