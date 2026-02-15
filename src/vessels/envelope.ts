import type { MsgContext } from "../auto-reply/templating.js";
import type { NormalizedMessageEnvelope } from "./types.js";

export function normalizeEnvelopeFromContext(ctx: MsgContext): NormalizedMessageEnvelope {
  const messageId =
    ctx.MessageSidFull ?? ctx.MessageSid ?? ctx.MessageSidFirst ?? ctx.MessageSidLast ?? undefined;
  const conversationId = ctx.OriginatingTo ?? ctx.To ?? ctx.From ?? "";
  const channel = (ctx.OriginatingChannel ?? ctx.Surface ?? ctx.Provider ?? "unknown").toLowerCase();

  return {
    vessel: typeof ctx.Surface === "string" ? ctx.Surface : channel,
    channel,
    accountId: ctx.AccountId,
    sessionKey: ctx.SessionKey ?? "",
    conversationId,
    senderId: ctx.SenderId ?? ctx.From ?? "",
    recipientId: ctx.To,
    messageId,
    timestamp: typeof ctx.Timestamp === "number" && Number.isFinite(ctx.Timestamp) ? ctx.Timestamp : undefined,
    content: {
      text:
        typeof ctx.BodyForCommands === "string"
          ? ctx.BodyForCommands
          : typeof ctx.RawBody === "string"
            ? ctx.RawBody
            : ctx.Body,
      mediaPath: ctx.MediaPath,
      mediaType: ctx.MediaType,
    },
    metadata: {
      provider: ctx.Provider,
      surface: ctx.Surface,
      threadId: ctx.MessageThreadId,
      senderName: ctx.SenderName,
      senderUsername: ctx.SenderUsername,
      senderE164: ctx.SenderE164,
      originatingChannel: ctx.OriginatingChannel,
      originatingTo: ctx.OriginatingTo,
    },
  };
}
