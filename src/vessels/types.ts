export type VesselCapabilities = {
  text: boolean;
  images: boolean;
  voice: boolean;
};

export type NormalizedMessageEnvelope = {
  vessel: string;
  channel: string;
  accountId?: string;
  sessionKey: string;
  conversationId: string;
  senderId: string;
  recipientId?: string;
  messageId?: string;
  timestamp?: number;
  content: {
    text?: string;
    mediaPath?: string;
    mediaType?: string;
  };
  metadata?: Record<string, unknown>;
};

export type VesselChannelMetadata = {
  channelId: string;
  accountId?: string;
  conversationId?: string;
};

export type VesselOnMessageHandler<TInbound> = (
  message: TInbound,
  envelope: NormalizedMessageEnvelope,
) => Promise<void>;

export type VesselSubscription = {
  close: () => Promise<void>;
  onClose?: Promise<unknown>;
  signalClose?: (reason?: any) => void;
  sendMessage?: (
    to: string,
    text: string,
    mediaBuffer?: Buffer,
    mediaType?: string,
    options?: { gifPlayback?: boolean; accountId?: string },
  ) => Promise<{ messageId: string }>;
  sendPoll?: (to: string, poll: any) => Promise<{ messageId: string }>;
  sendReaction?: (
    chatJid: string,
    messageId: string,
    emoji: string,
    fromMe: boolean,
    participant?: string,
  ) => Promise<void>;
  sendComposingTo?: (to: string) => Promise<void>;
};

export interface VesselAdapter<TInbound = unknown> {
  readonly id: string;
  readonly capabilities: VesselCapabilities;
  onMessage(handler: VesselOnMessageHandler<TInbound>): Promise<VesselSubscription>;
  sendMessage(params: { to: string; text: string; accountId?: string }): Promise<unknown>;
  getSessionKey(envelope: NormalizedMessageEnvelope): string;
  getChannelMetadata(envelope: NormalizedMessageEnvelope): VesselChannelMetadata;
}
