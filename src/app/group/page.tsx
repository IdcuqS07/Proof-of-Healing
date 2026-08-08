"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/state/app-provider";
import { Badge, Button, Card } from "@/components/ui";
import {
  PEER_GROUP_GATE_DAYS as GATE_DAYS,
  aliasFor,
  createLocalTransport,
  signMessage,
  verifiedMessages,
  type GroupMessage,
} from "@/lib/peer-group";

export default function GroupPage() {
  const { ready, account, badges, checkPeerAccess } = useApp();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [rejected, setRejected] = useState(0);
  const [draft, setDraft] = useState("");
  const transport = useMemo(() => createLocalTransport(), []);

  useEffect(() => {
    if (!account) {
      setAllowed(false);
      return;
    }

    void checkPeerAccess(GATE_DAYS).then(setAllowed);

    const accept = async (feed: GroupMessage[]) => {
      const verified = await verifiedMessages(feed, GATE_DAYS);
      setMessages(verified);
      setRejected(feed.length - verified.length);
    };

    void accept(transport.read());
    return transport.subscribe((feed) => void accept(feed));
  }, [account, badges, checkPeerAccess, transport]);

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
  const badge = [...badges].sort((a, b) => b.requiredDays - a.requiredDays)[0];

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
            if (!body || !badge) return;

            void signMessage(messages, {
              alias,
              body,
              at: new Date().toISOString(),
              badgeDays: badge.requiredDays,
              proofId: badge.proofId,
            }).then((message) => {
              setMessages([...messages, message]);
              transport.publish(message);
              setDraft("");
            });
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
          Setiap pesan membawa badge penulis dan tertaut hash ke pesan sebelumnya, lalu diverifikasi
          ulang saat dibaca — feed direplikasi antar tab lewat BroadcastChannel tanpa server.
          {rejected > 0 ? ` ${rejected} pesan ditolak karena gagal verifikasi.` : ""}
        </p>
      </Card>
    </div>
  );
}
