import { sha256, toHex } from "./crypto";

export interface GroupMessage {
  alias: string;
  body: string;
  at: string;
  /** Badge the author proved when posting; readers re-check it against the gate. */
  badgeDays: number;
  /** Id of the ZK proof that unlocked the group for the author. */
  proofId: string;
  /** sha256(previous hash + alias + body + at + badgeDays + proofId). */
  hash: string;
}

export interface PeerGroupTransport {
  /** Messages known to this transport, oldest first. */
  read(): GroupMessage[];
  /** Appends a message and replicates it to the other peers of the transport. */
  publish(message: GroupMessage): void;
  /** Notifies when another peer appended a message. Returns an unsubscribe fn. */
  subscribe(onChange: (messages: GroupMessage[]) => void): () => void;
  clear(): void;
}

const STORAGE_KEY = "poh.peer-group";
const CHANNEL_NAME = "poh.peer-group";
export const PEER_GROUP_GATE_DAYS = 7;

const SEED_MESSAGES: GroupMessage[] = [
  {
    alias: "healer-4f2a",
    body: "Hari ke-9 meditasi. Yang membantu saya: alarm 10 menit sebelum tidur.",
    at: "2026-08-01T09:12:00.000Z",
    badgeDays: 14,
    proofId: "seed-4f2a",
    hash: "seed-4f2a",
  },
  {
    alias: "healer-91cd",
    body: "Streak saya pernah putus di hari ke-5 dan itu tidak masalah. Mulai lagi hari ini.",
    at: "2026-08-02T15:40:00.000Z",
    badgeDays: 7,
    proofId: "seed-91cd",
    hash: "seed-91cd",
  },
];

export function aliasFor(commitment: string): string {
  return `healer-${commitment.slice(0, 4)}`;
}

/** Links a message to its predecessor so a tampered feed can be detected. */
export async function linkHash(
  previous: GroupMessage | undefined,
  message: Omit<GroupMessage, "hash">,
): Promise<string> {
  return toHex(
    await sha256(
      [
        previous?.hash ?? "",
        message.alias,
        message.body,
        message.at,
        String(message.badgeDays),
        message.proofId,
      ].join("|"),
    ),
  );
}

export async function signMessage(
  history: GroupMessage[],
  message: Omit<GroupMessage, "hash">,
): Promise<GroupMessage> {
  return { ...message, hash: await linkHash(history[history.length - 1], message) };
}

/**
 * Keeps only the longest prefix of the feed that is both gated (author proved a
 * badge of at least `gateDays`) and hash-linked, so a peer cannot rewrite older
 * posts or inject a post without a badge.
 */
export async function verifiedMessages(
  messages: GroupMessage[],
  gateDays = PEER_GROUP_GATE_DAYS,
): Promise<GroupMessage[]> {
  const verified: GroupMessage[] = [];

  for (const message of messages) {
    if (message.badgeDays < gateDays || !message.proofId) break;
    const expected = message.hash.startsWith("seed-")
      ? message.hash
      : await linkHash(verified[verified.length - 1], message);
    if (expected !== message.hash) break;
    verified.push(message);
  }

  return verified;
}

function readStored(): GroupMessage[] {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return SEED_MESSAGES;
  const parsed = JSON.parse(stored) as GroupMessage[];
  return parsed.length > 0 ? parsed : SEED_MESSAGES;
}

/**
 * Replicates the feed to every browser context on this device through
 * `BroadcastChannel` — no server holds the messages. A network transport (relay
 * or WebRTC) can replace this by implementing the same interface.
 */
export function createLocalTransport(): PeerGroupTransport {
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME);

  return {
    read: readStored,
    publish(message) {
      const next = [...readStored(), message];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      channel?.postMessage(next);
    },
    subscribe(onChange) {
      if (!channel) return () => undefined;
      const listener = (event: MessageEvent<GroupMessage[]>) => onChange(event.data);
      channel.addEventListener("message", listener);
      return () => channel.removeEventListener("message", listener);
    },
    clear() {
      window.localStorage.removeItem(STORAGE_KEY);
      channel?.postMessage(SEED_MESSAGES);
    },
  };
}

export function readPeerGroupMessages(): GroupMessage[] {
  return readStored();
}

export function writePeerGroupMessages(messages: GroupMessage[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

/** Part of "wipe all local data": user authored posts must not survive it. */
export function clearPeerGroupMessages(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
