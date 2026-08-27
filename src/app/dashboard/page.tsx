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

  if (!ready) return <p className="text-slate-500">Loading local data…</p>;

  if (!account) {
    return (
      <Card title="Not registered" subtitle="Complete Step 1 on the homepage first.">
        <Link href="/" className="text-sm text-emerald-400 hover:underline">
          ← Return to homepage to Connect Wallet & Register
        </Link>
      </Card>
    );
  }

  const provenToday = proofs.some((proof) => proof.date === todayISO());
  const upcoming = nextMilestone(streak, MILESTONES);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Current streak" value={`${streak} days`} />
        <Stat label="Best streak" value={`${best} days`} />
        <Stat label="On-chain proofs" value={proofs.length} hint="Compact transactions" />
        <Stat
          label="Next milestone"
          value={upcoming ? `${upcoming} days` : "Complete"}
          hint={upcoming ? `${upcoming - streak} days remaining` : "All badges achieved"}
        />
      </div>

      <Card
        title="Tracked habits"
        subtitle="Habit names are stored encrypted only on this device."
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
            aria-label="Habit name"
            placeholder="Morning meditation"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            aria-label="Category"
            placeholder="Meditation"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            aria-label="Daily target"
            placeholder="15 minutes"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={busy === "habit"}>
            Add
          </Button>
        </form>

        <ul className="mt-4 space-y-2">
          {habits.length === 0 ? (
            <li className="text-sm text-slate-500">No habits yet. Add one above.</li>
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
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title={`Daily note — ${todayISO()}`}
        subtitle="Stored locally with AES-256-GCM. Only commitment hash is used for proof."
        footer={
          today ? (
            <p className="text-xs text-slate-500">
              Today&apos;s commitment hash: <Mono>{today.commitmentHash}</Mono>
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
            <legend className="text-sm text-slate-400">Habits completed today</legend>
            {habits.length === 0 ? (
              <p className="text-sm text-slate-500">Add habits first.</p>
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
            Today&apos;s mood: <span className="text-slate-200">{mood}/5</span>
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
            Emotion journal (optional)
            <textarea
              rows={4}
              value={journal}
              onChange={(event) => setJournal(event.target.value)}
              placeholder="Write freely — this content never leaves your device."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy === "journal"}>
              Save local note
            </Button>
            <Button
              type="button"
              data-testid="submit-daily-proof"
              variant="ghost"
              onClick={() => void submitDailyProof()}
              disabled={busy === "proof" || cooldownRemaining > 0 || provenToday}
            >
              {busy === "proof" ? "Creating proof…" : "Submit Daily Proof"}
            </Button>
            {cooldownRemaining > 0 ? (
              <span className="text-xs text-amber-300">
                Contract cooldown: {formatDuration(cooldownRemaining)} remaining
              </span>
            ) : null}
            {provenToday ? (
              <Badge tone="emerald">Today&apos;s proof already accepted</Badge>
            ) : null}
          </div>
        </form>
      </Card>

      <Card title="On-chain proof history" subtitle="Only hash and time are recorded on ledger.">
        {proofs.length === 0 ? (
          <p className="text-sm text-slate-500">No proofs submitted yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {[...proofs].reverse().map((proof) => (
              <li
                key={proof.date}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-200">{proof.date}</span>
                  <Badge tone="emerald">PoW nonce {proof.powNonce.toLocaleString("en-US")}</Badge>
                  <span className="text-xs text-slate-500">tx {proof.txId.slice(0, 18)}…</span>
                </div>
                <Mono>{proof.commitmentHash}</Mono>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Privacy controls"
        subtitle={`${entries.length} journal entries stored encrypted in this browser.`}
      >
        <Button variant="danger" onClick={() => void wipe()} disabled={busy === "wipe"}>
          Delete all local data
        </Button>
      </Card>
    </div>
  );
}
