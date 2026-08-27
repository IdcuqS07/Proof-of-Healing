"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/state/app-provider";
import { Badge, Button, Card } from "@/components/ui";
import {
  PEER_GROUP_GATE_DAYS as GATE_DAYS,
  aliasFor,
  readPeerGroupMessages,
  writePeerGroupMessages,
  type GroupMessage,
} from "@/lib/peer-group";

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
    setMessages(readPeerGroupMessages());
  }, [account, badges, checkPeerAccess]);

  if (!ready || allowed === null) return <p className="text-slate-500">Verifying ZK Badge…</p>;

  if (!account) {
    return (
      <Card title="Not registered">
        <Link href="/" className="text-sm text-emerald-400 hover:underline">
          ← Register first on homepage
        </Link>
      </Card>
    );
  }

  if (!allowed) {
    return (
      <Card
        title="Group access locked"
        subtitle={`Need ZK Badge with at least ${GATE_DAYS} day streak to enter.`}
      >
        <p className="text-sm text-slate-400">
          Compact contract verifies your badge without knowing who&apos;s asking. Claim badge
          first on the ZK Badge page.
        </p>
        <Link href="/badges" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">
          Open ZK Badge page →
        </Link>
      </Card>
    );
  }

  const alias = aliasFor(account.commitment);

  return (
    <div className="space-y-6">
      <Card
        title="Exclusive Anonymous Support Group"
        subtitle="You enter as derived identity from ZK commitment, not your name or wallet."
      >
        <div className="flex items-center gap-2">
          <Badge tone="emerald">Verified ≥ {GATE_DAYS} days</Badge>
          <span className="text-sm text-slate-400">Your alias: {alias}</span>
        </div>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const body = draft.trim();
            if (!body) return;
            const next = [...messages, { alias, body, at: new Date().toISOString() }];
            setMessages(next);
            writePeerGroupMessages(next);
            setDraft("");
          }}
        >
          <textarea
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Share motivation without revealing your identity."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <Button type="submit">Send anonymously</Button>
        </form>
      </Card>

      <Card title="Conversation">
        <ul className="space-y-3">
          {[...messages].reverse().map((message) => (
            <li
              key={`${message.alias}-${message.at}`}
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
            >
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono text-slate-400">{message.alias}</span>
                <span>{new Date(message.at).toLocaleString("en-US")}</span>
              </div>
              <p className="mt-1 text-sm text-slate-200">{message.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-600">
          Group feed is simulated locally in Wave 2; decentralized messaging layer enters
          Wave 3 roadmap.
        </p>
      </Card>
    </div>
  );
}
