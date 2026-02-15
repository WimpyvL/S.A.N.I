import type { MsgContext } from "../auto-reply/templating.js";
import { getReplyFromConfig } from "../auto-reply/reply.js";
import { loadConfig } from "../config/config.js";
import { monitorWebChannel } from "../web/auto-reply.js";
import { createCliVesselAdapter } from "../vessels/cli.js";

function asPayloads(value: Awaited<ReturnType<typeof getReplyFromConfig>>) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export async function runVesselChat(vesselName: string): Promise<boolean> {
  const vessel = vesselName.trim().toLowerCase();
  if (vessel === "whatsapp" || vessel === "web") {
    await monitorWebChannel(false);
    return true;
  }
  if (vessel !== "cli") {
    return false;
  }

  const cfg = loadConfig();
  const adapter = createCliVesselAdapter({ cfg });
  process.stdout.write('CLI vessel ready. Type /exit to quit.\n');
  const session = await adapter.onMessage(async (message, envelope) => {
    const ctx: MsgContext = {
      Body: message.body,
      RawBody: message.body,
      CommandBody: message.body,
      BodyForCommands: message.body,
      From: message.from,
      To: message.to,
      SessionKey: envelope.sessionKey,
      AccountId: message.accountId,
      Timestamp: message.timestamp,
      MessageSid: message.messageId,
      Provider: "cli",
      Surface: "cli",
      OriginatingTo: message.from,
      SenderId: message.from,
      MessageEnvelope: envelope,
      CommandAuthorized: true,
    };

    const reply = await getReplyFromConfig(ctx);
    const payloads = asPayloads(reply);
    if (payloads.length === 0) {
      return;
    }
    for (const payload of payloads) {
      const text = payload.text?.trim();
      if (text) {
        await adapter.sendMessage({ to: message.from, text, accountId: message.accountId });
      }
      for (const mediaUrl of payload.mediaUrls ?? []) {
        await adapter.sendMessage({
          to: message.from,
          text: `[media] ${mediaUrl}`,
          accountId: message.accountId,
        });
      }
      if (payload.mediaUrl) {
        await adapter.sendMessage({
          to: message.from,
          text: `[media] ${payload.mediaUrl}`,
          accountId: message.accountId,
        });
      }
    }
  });
  await session.onClose;
  return true;
}
