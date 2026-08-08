import type { JournalEntry } from "./types";

const DAY_MS = 86_400_000;

export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function shiftISO(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function isCompleted(entry: JournalEntry): boolean {
  return entry.completedHabitIds.length > 0;
}

/**
 * Current streak: number of consecutive completed days ending today (or
 * yesterday, so a day still in progress does not reset the counter).
 */
export function currentStreak(entries: JournalEntry[], today: string = todayISO()): number {
  const completed = new Set(entries.filter(isCompleted).map((entry) => entry.date));
  let cursor = completed.has(today) ? today : shiftISO(today, -1);
  let streak = 0;
  while (completed.has(cursor)) {
    streak += 1;
    cursor = shiftISO(cursor, -1);
  }
  return streak;
}

export function longestStreak(entries: JournalEntry[]): number {
  const dates = entries.filter(isCompleted).map((entry) => entry.date).sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of dates) {
    run = previous !== null && shiftISO(previous, 1) === date ? run + 1 : 1;
    previous = date;
    best = Math.max(best, run);
  }
  return best;
}

export function nextMilestone(streak: number, milestones: readonly number[]): number | null {
  return milestones.find((milestone) => milestone > streak) ?? null;
}
