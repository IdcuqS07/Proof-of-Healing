import { describe, expect, it } from "vitest";
import {
  PEER_GROUP_GATE_DAYS,
  aliasFor,
  signMessage,
  verifiedMessages,
  type GroupMessage,
} from "../src/lib/peer-group";

const base = { alias: "healer-abcd", badgeDays: 7, proofId: "proof-1" };

async function feed(...bodies: string[]): Promise<GroupMessage[]> {
  const messages: GroupMessage[] = [];
  for (const [index, body] of bodies.entries()) {
    messages.push(
      await signMessage(messages, { ...base, body, at: `2026-08-0${index + 1}T00:00:00.000Z` }),
    );
  }
  return messages;
}

describe("peer group feed", () => {
  it("derives an alias from the commitment, never from the wallet", () => {
    expect(aliasFor("4f2a9c31deadbeef")).toBe("healer-4f2a");
  });

  it("accepts a hash-linked feed authored with a sufficient badge", async () => {
    const messages = await feed("hari ke-7", "hari ke-8");
    expect(await verifiedMessages(messages)).toHaveLength(2);
  });

  it("drops a message whose body was tampered with", async () => {
    const messages = await feed("hari ke-7", "hari ke-8");
    messages[1] = { ...messages[1], body: "spam" };

    expect(await verifiedMessages(messages)).toHaveLength(1);
  });

  it("drops the tail when an earlier message is rewritten", async () => {
    const messages = await feed("hari ke-7", "hari ke-8", "hari ke-9");
    messages[0] = { ...messages[0], body: "rewritten" };

    expect(await verifiedMessages(messages)).toHaveLength(0);
  });

  it("rejects a message posted without the required badge", async () => {
    const messages = await feed("hari ke-7");
    messages.push(
      await signMessage(messages, {
        alias: "healer-ffff",
        body: "tanpa badge",
        at: "2026-08-09T00:00:00.000Z",
        badgeDays: PEER_GROUP_GATE_DAYS - 1,
        proofId: "proof-2",
      }),
    );

    expect(await verifiedMessages(messages)).toHaveLength(1);
  });

  it("rejects a message that carries no proof id", async () => {
    const messages = await feed("hari ke-7");
    messages.push(
      await signMessage(messages, {
        ...base,
        proofId: "",
        body: "mengaku punya badge",
        at: "2026-08-09T00:00:00.000Z",
      }),
    );

    expect(await verifiedMessages(messages)).toHaveLength(1);
  });
});
