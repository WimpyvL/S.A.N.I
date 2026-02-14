import process from "node:process";
import readline from "node:readline/promises";
import { resolveAgentRoute } from "../routing/resolve-route.js";
import type { SANIConfig } from "../config/config.js";
import type { NormalizedMessageEnvelope, VesselAdapter } from "./types.js";

type CliInboundMessage = {
  body: string;
  from: string;
  to: string;
  accountId: string;
  timestamp: number;
  messageId: string;
};

export function createCliVesselAdapter(options: {
  cfg: SANIConfig;
  from?: string;
  to?: string;
  accountId?: string;
}): VesselAdapter<CliInboundMessage> {
  const from = options.from ?? "cli:user";
  const to = options.to ?? "sani";
  const accountId = options.accountId ?? "local";

  return {
    id: "cli",
    capabilities: { text: true, images: false, voice: false },
    async onMessage(handler) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const onClose = (async () => {
        try {
          let index = 0;
          while (true) {
            const body = (await rl.question("you> ")).trim();
            if (!body) {
              continue;
            }
            if (body === "/exit" || body === "/quit") {
              break;
            }
            index += 1;
            const message: CliInboundMessage = {
              body,
              from,
              to,
              accountId,
              timestamp: Date.now(),
              messageId: `cli-${index}`,
            };
            const route = resolveAgentRoute({
              cfg: options.cfg,
              channel: "cli",
              accountId,
              peer: { kind: "dm", id: from },
              inboundText: body,
            });
            const envelope: NormalizedMessageEnvelope = {
              vessel: "cli",
              channel: "cli",
              accountId,
              sessionKey: route.sessionKey,
              conversationId: from,
              senderId: from,
              recipientId: to,
              messageId: message.messageId,
              timestamp: message.timestamp,
              content: { text: body },
              metadata: { matchedBy: route.matchedBy },
            };
            await handler(message, envelope);
          }
        } finally {
          rl.close();
        }
      })();

      return {
        close: async () => {
          rl.close();
        },
        onClose,
      };
    },
    async sendMessage(params) {
      process.stdout.write(`sani> ${params.text}\n`);
      return { ok: true };
    },
    getSessionKey(envelope) {
      return envelope.sessionKey;
    },
    getChannelMetadata(envelope) {
      return {
        channelId: "cli",
        accountId: envelope.accountId,
        conversationId: envelope.conversationId,
      };
    },
  };
}
