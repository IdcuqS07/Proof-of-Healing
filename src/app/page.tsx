"use client";

import Link from "next/link";
import { useApp } from "@/state/app-provider";
import { Badge, Button, Card, Mono, Stat } from "@/components/ui";
import { STAKE_AMOUNT } from "@/lib/contract/simulator";

const STEPS = [
  {
    title: "1. Hubungkan wallet & daftar anonim",
    body: "Micro-bonding mengunci deposit kecil token testnet sebagai jaminan bahwa Anda manusia. Deposit dikembalikan penuh saat milestone tercapai.",
  },
  {
    title: "2. Catat kebiasaan harian secara lokal",
    body: "Jurnal, mood, dan status kebiasaan disimpan terenkripsi AES-256-GCM di IndexedDB perangkat Anda. Tidak ada server yang menerimanya.",
  },
  {
    title: "3. Kirim bukti harian",
    body: "Peramban menjalankan Proof-of-Work ringan, lalu kontrak Compact memverifikasi jeda 18 jam antar entri untuk menolak bot.",
  },
  {
    title: "4. Klaim ZK Badge",
    body: "Buktikan streak ≥ target tanpa mengungkap tanggal atau isi catatan. Badge terbit anonim dan deposit dikembalikan.",
  },
  {
    title: "5. Masuk Anonymous Peer Group",
    body: "ZK Badge menjadi tiket masuk grup dukungan anonim, tanpa nama, foto, atau identitas sosial.",
  },
];

export default function HomePage() {
  const { ready, wallet, account, connect, register, busy, streak, badges } = useApp();

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <Badge tone="emerald">Zero-Knowledge · Midnight Network</Badge>
        <h1 className="text-3xl font-semibold text-slate-100 sm:text-4xl">
          Buktikan konsistensi pemulihan Anda tanpa membuka satu pun catatan pribadi.
        </h1>
        <p className="max-w-3xl text-slate-400">
          Proof of Healing menyimpan jurnal kesehatan mental sepenuhnya di perangkat Anda dan hanya
          mengirim bukti matematika ke jaringan Midnight: cukup untuk membuktikan streak kebiasaan,
          tidak cukup untuk mengetahui apa pun tentang Anda.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Streak saat ini" value={ready ? `${streak} hari` : "…"} />
        <Stat label="ZK Badge dimiliki" value={ready ? badges.length : "…"} />
        <Stat
          label="Micro-bond"
          value={`${(STAKE_AMOUNT / 1_000_000).toFixed(2)} tDUST`}
          hint="Dikembalikan setelah milestone"
        />
      </div>

      <Card
        title="Mulai di sini"
        subtitle="Dua langkah persiapan; sisanya berjalan di perangkat Anda."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void connect()} disabled={!!wallet || busy === "connect"}>
            {wallet ? "Wallet terhubung" : busy === "connect" ? "Menghubungkan…" : "Connect Wallet"}
          </Button>
          <Button
            data-testid="register-button"
            onClick={() => void register()}
            disabled={!wallet || !!account || busy === "register"}
            variant={account ? "ghost" : "primary"}
          >
            {account
              ? "Sudah terdaftar"
              : busy === "register"
                ? "Menjalankan PoW & staking…"
                : "Register & Stake Deposit"}
          </Button>
          {account ? (
            <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline">
              Buka Dashboard →
            </Link>
          ) : null}
        </div>
        {wallet ? (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Alamat wallet (shielded)</dt>
              <dd>
                <Mono>{wallet.address}</Mono>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Jaringan</dt>
              <dd className="text-slate-300">{wallet.network}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Saldo</dt>
              <dd className="text-slate-300">{(wallet.balance / 1_000_000).toFixed(3)} tDUST</dd>
            </div>
            {wallet.unshieldedAddress ? (
              <div>
                <dt className="text-slate-500">Alamat untuk faucet (unshielded)</dt>
                <dd>
                  <Mono>{wallet.unshieldedAddress}</Mono>
                </dd>
              </div>
            ) : null}
            {account ? (
              <div>
                <dt className="text-slate-500">Komitmen anonim on-chain</dt>
                <dd>
                  <Mono>{account.commitment}</Mono>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Belum punya Midnight Extension Wallet? Aplikasi otomatis memakai wallet pengembangan
            lokal sehingga seluruh alur tetap bisa dicoba.
          </p>
        )}
      </Card>

      <Card title="Panduan singkat" subtitle="Ringkasan User Guide Proof of Healing.">
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
