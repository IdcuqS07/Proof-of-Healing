const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function sha256(data: Uint8Array | string): Promise<Uint8Array> {
  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return new Uint8Array(digest);
}

/** Mirrors `persistentHash<Bytes<32>>` of the Compact contract. */
export async function persistentHash(seedHex: string): Promise<string> {
  return toHex(await sha256(fromHex(seedHex)));
}

export function randomSeedHex(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * Daily commitment hash (FR-2.3): binds the on-chain proof to the local,
 * encrypted journal entry without revealing any of its content.
 */
export async function dailyCommitmentHash(input: {
  seedHex: string;
  date: string;
  habitIds: string[];
  journal: string;
}): Promise<string> {
  const payload = JSON.stringify({
    seed: input.seedHex,
    date: input.date,
    habits: [...input.habitIds].sort(),
    journal: input.journal,
  });
  return toHex(await sha256(payload));
}

const KEY_ITERATIONS = 210_000;

async function deriveKey(seedHex: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(seedHex) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: KEY_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface SealedBox {
  salt: string;
  iv: string;
  ciphertext: string;
}

/** AES-256-GCM envelope encryption for everything that touches IndexedDB (FR-2.1). */
export async function seal(seedHex: string, plaintext: unknown): Promise<SealedBox> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(seedHex, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoder.encode(JSON.stringify(plaintext)) as BufferSource,
  );
  return { salt: toHex(salt), iv: toHex(iv), ciphertext: toHex(new Uint8Array(ciphertext)) };
}

export async function unseal<T>(seedHex: string, box: SealedBox): Promise<T> {
  const key = await deriveKey(seedHex, fromHex(box.salt));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromHex(box.iv) as BufferSource },
    key,
    fromHex(box.ciphertext) as BufferSource,
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
}
