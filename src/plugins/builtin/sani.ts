import type { SANIConfig } from "../../config/config.js";
import type { SessionEntry } from "../../config/sessions/types.js";
import type { PluginRecord, PluginRegistry } from "../registry.js";
import type { SANIPluginApi } from "../types.js";
import { resolveSessionAgentId, resolveAgentWorkspaceDir } from "../../agents/agent-scope.js";
import { writeLabyrinthSnapshot, writeThreadbornEntry } from "../../agents/sani-memory.js";
import { readRecentSessionSnippets } from "../../agents/sani-session.js";
import {
  matchesExitSaniTrigger,
  matchesHeySaniTrigger,
  matchesWhoAmITrigger,
  parseSaniCommandTrigger,
  type SaniModeTriggerAction,
} from "../../agents/sani.js";
import { resolveStorePath } from "../../config/sessions/paths.js";
import {
  loadSessionStore,
  updateSessionModeFlags,
  updateSessionStoreEntry,
} from "../../config/sessions/store.js";

const SANI_PLUGIN_ID = "sani";
const DEFAULT_SNAPSHOT_RATE_LIMIT_MINUTES = 2;
const DEFAULT_EXIT_RATE_LIMIT_MINUTES = 1;

function createSaniRecord(params: {
  source: string;
  origin: PluginRecord["origin"];
}): PluginRecord {
  return {
    id: SANI_PLUGIN_ID,
    name: "SANI Identity",
    description: "SANI outside-vessel identity triggers and session flags.",
    source: params.source,
    origin: params.origin,
    enabled: true,
    status: "loaded",
    toolNames: [],
    hookNames: [],
    channelIds: [],
    providerIds: [],
    gatewayMethods: [],
    cliCommands: [],
    services: [],
    commands: [],
    httpHandlers: 0,
    hookCount: 0,
    configSchema: false,
  };
}

function buildLabyrinthBody(params: {
  sessionKey: string;
  channelId?: string;
  from?: string;
  modes: { saniMode: boolean; labyrinthMode: boolean };
  snippets: Array<{ role: string; text: string }>;
}): string {
  const lines = [
    `- Timestamp: ${new Date().toISOString()}`,
    `- Channel: ${params.channelId ?? "unknown"}`,
    `- User: ${params.from || "unknown"}`,
    `- SessionKey: ${params.sessionKey}`,
    `- Modes: saniMode=${params.modes.saniMode ? "on" : "off"}, labyrinthMode=${
      params.modes.labyrinthMode ? "on" : "off"
    }`,
    "",
  ];
  if (params.snippets.length > 0) {
    lines.push("## Recent Messages");
    params.snippets.forEach((snippet, index) => {
      lines.push(`${index + 1}. ${snippet.role}: ${snippet.text}`);
    });
  } else {
    lines.push("## Recent Messages");
    lines.push("No recent session messages available.");
  }
  lines.push("");
  return lines.join("\n");
}

function resolveRateLimitMs(value: unknown, fallbackMinutes: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 0) {
      return 0;
    }
    return Math.max(1, value) * 60_000;
  }
  return fallbackMinutes * 60_000;
}

function shouldRateLimit(lastAt: number | undefined, limitMs: number, now: number): boolean {
  if (!limitMs || typeof lastAt !== "number") {
    return false;
  }
  return now - lastAt < limitMs;
}

function resolveTriggers(
  content: string,
  config: SANIConfig,
): {
  heySani: boolean;
  labyrinth: boolean;
  exitSani: boolean;
  commandAction: SaniModeTriggerAction | null;
} {
  const commandAction = parseSaniCommandTrigger(content, config);
  return {
    heySani: commandAction === "sani_on" || matchesHeySaniTrigger(content),
    labyrinth: commandAction === "labyrinth" || matchesWhoAmITrigger(content),
    exitSani: commandAction === "sani_off" || matchesExitSaniTrigger(content),
    commandAction,
  };
}

async function recordRateLimitTimestamp(params: {
  storePath: string;
  sessionKey: string;
  field: "lastLabyrinthSnapshotAt" | "lastSaniExitEventAt";
  now: number;
}): Promise<SessionEntry | null> {
  return await updateSessionStoreEntry({
    storePath: params.storePath,
    sessionKey: params.sessionKey,
    update: async () => ({ [params.field]: params.now }),
  });
}

export function registerSaniPlugin(params: {
  config: SANIConfig;
  registry: PluginRegistry;
  createApi: (record: PluginRecord, params: { config: SANIConfig }) => SANIPluginApi;
}): void {
  const record = createSaniRecord({ source: "builtin:sani", origin: "config" });
  params.registry.plugins.push(record);
  const api = params.createApi(record, { config: params.config });

  api.on("message_received", async (event, ctx) => {
    const content = event.content ?? "";
    const trigger = resolveTriggers(content, api.config);
    if (!trigger.heySani && !trigger.labyrinth && !trigger.exitSani) {
      return;
    }
    const metadata = event.metadata ?? {};
    const sessionKey =
      typeof metadata.sessionKey === "string" && metadata.sessionKey.trim()
        ? metadata.sessionKey.trim()
        : undefined;
    if (!sessionKey) {
      return;
    }
    const agentId = resolveSessionAgentId({ sessionKey, config: api.config });
    const storePath = resolveStorePath(api.config.session?.store, { agentId });
    const store = loadSessionStore(storePath);
    const entry = store[sessionKey];
    if (!entry) {
      return;
    }
    const sourceSessionId = entry.sessionId ?? sessionKey;
    const now = Date.now();

    if (trigger.heySani) {
      await updateSessionModeFlags({
        storePath,
        sessionKey,
        flags: { saniMode: true },
      });
    }

    if (trigger.labyrinth) {
      await updateSessionModeFlags({
        storePath,
        sessionKey,
        flags: { labyrinthMode: true },
      });

      const snapshotLimitMs = resolveRateLimitMs(
        api.config.agents?.defaults?.sani?.snapshotRateLimitMinutes,
        DEFAULT_SNAPSHOT_RATE_LIMIT_MINUTES,
      );
      if (shouldRateLimit(entry.lastLabyrinthSnapshotAt, snapshotLimitMs, now)) {
        return;
      }

      const workspaceDir = resolveAgentWorkspaceDir(api.config, agentId);
      const sessionFile = entry.sessionFile;
      const snippets = sessionFile ? readRecentSessionSnippets({ sessionFile }) : [];
      const body = buildLabyrinthBody({
        sessionKey,
        channelId: ctx.channelId,
        from: event.from,
        modes: {
          saniMode: entry.saniMode === true || trigger.heySani,
          labyrinthMode: true,
        },
        snippets,
      });
      await writeLabyrinthSnapshot({
        workspaceDir,
        title: "Labyrinth Snapshot",
        body,
        sourceSessionId,
        sourceTrigger: trigger.commandAction === "labyrinth" ? "LABYRINTH_COMMAND" : "WHO_AM_I",
      });
      await recordRateLimitTimestamp({
        storePath,
        sessionKey,
        field: "lastLabyrinthSnapshotAt",
        now,
      });
    }

    if (trigger.exitSani) {
      await updateSessionModeFlags({
        storePath,
        sessionKey,
        flags: { saniMode: false, labyrinthMode: false },
      });
      const exitLimitMs = resolveRateLimitMs(
        api.config.agents?.defaults?.sani?.exitRateLimitMinutes,
        DEFAULT_EXIT_RATE_LIMIT_MINUTES,
      );
      if (shouldRateLimit(entry.lastSaniExitEventAt, exitLimitMs, now)) {
        return;
      }
      const workspaceDir = resolveAgentWorkspaceDir(api.config, agentId);
      const body = [
        `- Timestamp: ${new Date(now).toISOString()}`,
        `- Channel: ${ctx.channelId ?? "unknown"}`,
        `- User: ${event.from || "unknown"}`,
        `- SessionKey: ${sessionKey}`,
        "",
        "SANI mode exit requested; session flags cleared.",
        "",
      ].join("\n");
      await writeThreadbornEntry({
        workspaceDir,
        title: "SANI Mode Exit",
        body,
        tags: ["sani:exit"],
        sourceSessionId,
        sourceTrigger: trigger.commandAction === "sani_off" ? "SANI_OFF_COMMAND" : "EXIT_SANI_MODE",
      });
      await recordRateLimitTimestamp({
        storePath,
        sessionKey,
        field: "lastSaniExitEventAt",
        now,
      });
    }
  });
}
