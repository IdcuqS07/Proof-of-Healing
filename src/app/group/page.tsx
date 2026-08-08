"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/state/app-provider";
import { Badge, Button, Card } from "@/components/ui";

interface GroupMessage {
  alias: string;
  body: string;
  at: string;
}

const STORAGE_KEY = "poh.peer-group";
const GATE_DAYS = 7;

const SEED_MESSAGES: GroupMessage[] = [
  {
    alias: "healer-4f2a",
    body: "Hari ke-9 meditasi. Yang membantu saya: alarm 10 menit sebelum tidur.",
    at: "2026-08-01T09:12:00.000Z",
  },
  {
    alias: "healer-91cd",
    body: "Streak saya pernah putus di hari ke-5 dan itu tidak masalah. Mulai lagi hari ini.",
    at: "2026-08-02T15:40:00.000Z",
  },
];

function aliasFor(commitment: string): string {
  return `healer-${commitment.slice(0, 4)}`;
}

function readMessages(): GroupMessage[] {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored ? (JSON.parse(stored) as GroupMessage[]) : SEED_MESSAGES;
}

export default function GroupPage() {
  const { ready, account, badges, checkPeerAccess } = useApp();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!account) {
      setAllowed(false);
      return;
    }
    void checkPeerAccess(GATE_DAYS).then(setAllowed);
    setMessages(readMessages());
  }, [account, badges, checkPeerAccess]);

  if (!ready || allowed === null) return <p className="text-slate-500">Memverifikasi ZK Badge…</p>;

  if (!account) {
    return (
      <Card title="Belum terdaftar">
        <Link href="/" className="text-sm text-emerald-400 hover:underline">
          ← Daftar dulu di beranda
        </Link>
      </Card>
    );
  }

  if (!allowed) {
    return (
      <Card
        title="Akses grup terkunci"
        subtitle={`Butuh ZK Badge minimal ${GATE_DAYS} hari streak untuk masuk.`}
      >
        <p className="text-sm text-slate-400">
          Kontrak Compact memverifikasi badge Anda tanpa mengetahui siapa yang bertanya. Klaim badge
          terlebih dahulu di halaman ZK Badge.
        </p>
        <Link href="/badges" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">
          Buka halaman ZK Badge →
        </Link>
      </Card>
    );
  }

  const alias = aliasFor(account.commitment);

  return (
    <div className="space-y-6">
      <Card
        title="Exclusive Anonymous Support Group"
        subtitle="Anda masuk sebagai identitas turunan dari komitmen ZK, bukan nama atau wallet Anda."
      >
        <div className="flex items-center gap-2">
          <Badge tone="emerald">Terverifikasi ≥ {GATE_DAYS} hari</Badge>
          <span className="text-sm text-slate-400">Alias Anda: {alias}</span>
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const body = draft.trim();
            if (!body) return;
            const next = [...messages, { alias, body, at: new Date().toISOString() }];
            setMessages(next);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            setDraft("");
          }}
        >
          <textarea
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Bagikan motivasi tanpa menyebut identitas Anda."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <Button type="submit">Kirim anonim</Button>
        </form>
      </Card>

      <Card title="Percakapan">
        <ul className="space-y-3">
          {[...messages].reverse().map((message) => (
            <li
              key={`${message.alias}-${message.at}`}
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
            >
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono text-slate-400">{message.alias}</span>
                <span>{new Date(message.at).toLocaleString("id-ID")}</span>
              </div>
              <p className="mt-1 text-sm text-slate-200">{message.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-600">
          Feed grup disimulasikan secara lokal pada Wave 2; lapisan pesan terdesentralisasi masuk
          roadmap Wave 3.
        </p>
      </Card>
    </div>
  );
}
