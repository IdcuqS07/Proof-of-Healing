export interface GroupMessage {
  alias: string;
  body: string;
  at: string;
}

const STORAGE_KEY = "poh.peer-group";
export const PEER_GROUP_GATE_DAYS = 7;

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

export function aliasFor(commitment: string): string {
  return `healer-${commitment.slice(0, 4)}`;
}

export function readPeerGroupMessages(): GroupMessage[] {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored ? (JSON.parse(stored) as GroupMessage[]) : SEED_MESSAGES;
}

export function writePeerGroupMessages(messages: GroupMessage[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

/** Part of "wipe all local data": user authored posts must not survive it. */
export function clearPeerGroupMessages(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
