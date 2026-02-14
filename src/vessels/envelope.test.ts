import { describe, expect, it } from "vitest";
import { normalizeEnvelopeFromContext } from "./envelope.js";

describe("normalizeEnvelopeFromContext", () => {
  it("builds a normalized envelope for hook metadata", () => {
    const envelope = normalizeEnvelopeFromContext({
      BodyForCommands: "hello",
      From: "+15550001111",
      To: "+15550002222",
      SessionKey: "agent:main:whatsapp|+15550001111",
      AccountId: "personal",
      MessageSid: "abc123",
      Timestamp: 123,
      Provider: "whatsapp",
      Surface: "whatsapp",
      OriginatingChannel: "whatsapp",
      OriginatingTo: "+15550001111",
      SenderId: "+15550001111",
    });

    expect(envelope).toMatchObject({
      vessel: "whatsapp",
      channel: "whatsapp",
      accountId: "personal",
      sessionKey: "agent:main:whatsapp|+15550001111",
      conversationId: "+15550001111",
      senderId: "+15550001111",
      recipientId: "+15550002222",
      messageId: "abc123",
      content: { text: "hello" },
    });
  });
});
