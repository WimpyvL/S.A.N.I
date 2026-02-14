import { resolveAgentRoute } from "../routing/resolve-route.js";
import type { SANIConfig } from "../config/config.js";
import { monitorWebInbox } from "../web/inbound.js";
import { sendMessageWhatsApp } from "../web/outbound.js";
import type { WebInboundMessage } from "../web/inbound/types.js";
import type { NormalizedMessageEnvelope, VesselAdapter } from "./types.js";

export function toWhatsAppEnvelope(params: {
  message: WebInboundMessage;
  sessionKey: string;
}): NormalizedMessageEnvelope {
  const { message, sessionKey } = params;
  return {
    vessel: "whatsapp",
    channel: "whatsapp",
    accountId: message.accountId,
    sessionKey,
    conversationId: message.conversationId ?? message.from,
    senderId: message.senderJid ?? message.senderE164 ?? message.from,
    recipientId: message.to,
    messageId: message.id,
    timestamp: message.timestamp,
    content: {
      text: message.body,
      mediaPath: message.mediaPath,
      mediaType: message.mediaType,
    },
    metadata: {
      chatType: message.chatType,
      chatId: message.chatId,
      senderName: message.senderName,
      groupSubject: message.groupSubject,
      mentionedJids: message.mentionedJids,
    },
  };
}

export function createWhatsAppVesselAdapter(options: {
  cfg: SANIConfig;
  verbose: boolean;
  accountId: string;
  authDir: string;
  mediaMaxMb?: number;
  sendReadReceipts?: boolean;
  debounceMs?: number;
  shouldDebounce?: (msg: WebInboundMessage) => boolean;
  listenerFactory?: typeof monitorWebInbox;
}): VesselAdapter<WebInboundMessage> {
  const listenerFactory = options.listenerFactory ?? monitorWebInbox;
  return {
    id: "whatsapp",
    capabilities: { text: true, images: true, voice: true },
    async onMessage(handler) {
      const listener = await listenerFactory({
        verbose: options.verbose,
        accountId: options.accountId,
        authDir: options.authDir,
        mediaMaxMb: options.mediaMaxMb,
        sendReadReceipts: options.sendReadReceipts,
        debounceMs: options.debounceMs,
        shouldDebounce: options.shouldDebounce,
        onMessage: async (message) => {
          const route = resolveAgentRoute({
            cfg: options.cfg,
            channel: "whatsapp",
            accountId: message.accountId,
            peer: {
              kind: message.chatType === "group" ? "group" : "dm",
              id: message.chatType === "group" ? message.chatId : (message.senderE164 ?? message.from),
            },
            inboundText: message.body,
          });
          await handler(message, toWhatsAppEnvelope({ message, sessionKey: route.sessionKey }));
        },
      });
      return listener;
    },
    async sendMessage(params) {
      return sendMessageWhatsApp(params.to, params.text, {
        verbose: options.verbose,
        accountId: params.accountId,
      });
    },
    getSessionKey(envelope) {
      return envelope.sessionKey;
    },
    getChannelMetadata(envelope) {
      return {
        channelId: "whatsapp",
        accountId: envelope.accountId,
        conversationId: envelope.conversationId,
      };
    },
  };
}
