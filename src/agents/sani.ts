import type { SaniConfig } from "../config/config.js";
import { resolveStorePath } from "../config/sessions/paths.js";
import { loadSessionStore, updateSessionStoreEntry } from "../config/sessions/store.js";
import { isTruthyEnvValue } from "../infra/env.js";
import { resolveAgentWorkspaceDir, resolveSessionAgentId } from "./agent-scope.js";
import { writeThreadbornEntry } from "./sani-memory.js";

export type SaniSessionFlags = {
  saniMode: boolean;
  labyrinthMode: boolean;
};

export type SaniModeTriggerAction = "sani_on" | "sani_off" | "labyrinth";

type SanitizedSaniLine = {
  raw: string;
  normalized: string;
};

export function resolveSaniEnabled(
  cfg?: SaniConfig,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (typeof env.SANI_SANI === "string") {
    return isTruthyEnvValue(env.SANI_SANI);
  }
  return cfg?.agents?.defaults?.sani?.enabled === true;
}

export function resolveSaniVaultSealingEnabled(
  _cfg?: SaniConfig,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (typeof env.SANI_VAULT_SEALING_ENABLED === "string") {
    return isTruthyEnvValue(env.SANI_VAULT_SEALING_ENABLED);
  }
  return false;
}

const DEFAULT_SANI_MODE_TTL_MINUTES = 60;

const DEFAULT_COMMAND_TRIGGER_PREFIX = "/";

export function resolveSaniModeCommandTriggersEnabled(config?: SaniConfig): boolean {
  return config?.agents?.defaults?.sani?.commandTriggersEnabled !== false;
}

export function resolveSaniModeCommandPrefix(config?: SaniConfig): string {
  const rawPrefix = config?.agents?.defaults?.sani?.commandTriggerPrefix;
  if (typeof rawPrefix !== "string") {
    return DEFAULT_COMMAND_TRIGGER_PREFIX;
  }
  const normalized = rawPrefix.trim();
  return normalized.length > 0 ? normalized : DEFAULT_COMMAND_TRIGGER_PREFIX;
}

function resolveSaniModeTtlMs(config?: SaniConfig): number | null {
  const raw = config?.agents?.defaults?.sani?.modeTtlMinutes;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw <= 0) {
      return null;
    }
    return Math.max(1, raw) * 60_000;
  }
  return DEFAULT_SANI_MODE_TTL_MINUTES * 60_000;
}

export async function readSaniSessionFlags(params: {
  config?: SaniConfig;
  sessionKey?: string;
  workspaceDir?: string;
  now?: number;
}): Promise<SaniSessionFlags> {
  const sessionKey = params.sessionKey?.trim();
  if (!sessionKey || !params.config) {
    return { saniMode: false, labyrinthMode: false };
  }
  const agentId = resolveSessionAgentId({
    sessionKey,
    config: params.config,
  });
  const storePath = resolveStorePath(params.config.session?.store, { agentId });
  const store = loadSessionStore(storePath);
  const entry = store[sessionKey];
  if (!entry) {
    return { saniMode: false, labyrinthMode: false };
  }
  const saniMode = entry.saniMode === true;
  const labyrinthMode = entry.labyrinthMode === true;
  const ttlMs = resolveSaniModeTtlMs(params.config);
  if (ttlMs && (saniMode || labyrinthMode)) {
    const now = params.now ?? Date.now();
    const lastModeUpdateAt =
      typeof entry.lastModeUpdateAt === "number" ? entry.lastModeUpdateAt : entry.updatedAt;
    if (lastModeUpdateAt && now - lastModeUpdateAt > ttlMs) {
      await updateSessionStoreEntry({
        storePath,
        sessionKey,
        update: async () => ({
          saniMode: false,
          labyrinthMode: false,
          lastModeUpdateAt: now,
        }),
      });
      const workspaceDir =
        params.workspaceDir?.trim() || resolveAgentWorkspaceDir(params.config, agentId);
      const body = [
        `- Timestamp: ${new Date(now).toISOString()}`,
        `- SessionKey: ${sessionKey}`,
        `- Event: auto-exit (ttl)`,
        `- Provenance: readSaniSessionFlags`,
        `- Previous: saniMode=${saniMode ? "on" : "off"}, labyrinthMode=${
          labyrinthMode ? "on" : "off"
        }`,
        `- TTL Minutes: ${Math.round(ttlMs / 60_000)}`,
        "",
        "SANI mode auto-cleared due to TTL expiry.",
        "",
      ].join("\n");
      await writeThreadbornEntry({
        workspaceDir,
        title: "SANI Auto-Exit (TTL)",
        body,
        tags: ["sani:ttl"],
        sourceSessionId: entry.sessionId ?? sessionKey,
        sourceTrigger: "AUTO_EXIT_TTL",
      });
      return { saniMode: false, labyrinthMode: false };
    }
  }
  return {
    saniMode,
    labyrinthMode,
  };
}

const HEY_SANI_LINE = /^\s*hey[\s,]+sani[.!?]*\s*$/i;
const WHO_AM_I_LINE = /^\s*who\s+am\s+i[.!?]*\s*$/i;
const EXIT_SANI_LINE = /^\s*exit\s+sani\s+mode[.!?]*\s*$/i;
const CODE_FENCE_PATTERN = /^\s*(```|~~~)/;
const FORWARDED_WRAPPER_PATTERN =
  /^\s*(?:>\s*)?(?:\*\*?)?(?:[-\u2014\s]*)?(?:begin\s+)?forwarded(?:\s+message|\s+from)?\b/i;

function collectTriggerableLines(text: string): SanitizedSaniLine[] {
  const lines = text.split(/\r?\n/);
  const result: SanitizedSaniLine[] = [];
  let inCodeBlock = false;
  let inForwardedWrapper = false;

  for (const line of lines) {
    const trimmedStart = line.trimStart();
    if (CODE_FENCE_PATTERN.test(trimmedStart)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      continue;
    }
    if (inForwardedWrapper) {
      if (trimmedStart.length === 0) {
        inForwardedWrapper = false;
      }
      continue;
    }
    if (trimmedStart.startsWith(">")) {
      continue;
    }
    if (FORWARDED_WRAPPER_PATTERN.test(trimmedStart)) {
      inForwardedWrapper = true;
      continue;
    }

    result.push({ raw: line, normalized: trimmedStart.toLowerCase() });
  }

  return result;
}

function hasStandaloneTriggerLine(text: string, pattern: RegExp): boolean {
  const lines = collectTriggerableLines(text);
  for (const line of lines) {
    if (pattern.test(line.raw)) {
      return true;
    }
  }
  return false;
}

export function parseSaniCommandTrigger(
  text: string,
  config?: SaniConfig,
): SaniModeTriggerAction | null {
  if (!resolveSaniModeCommandTriggersEnabled(config)) {
    return null;
  }
  const prefix = resolveSaniModeCommandPrefix(config);
  const saniCommand = `${prefix}sani`;
  const labyrinthCommand = `${prefix}labyrinth`;
  for (const line of collectTriggerableLines(text)) {
    if (!line.normalized.startsWith(prefix.toLowerCase())) {
      continue;
    }
    const normalized = line.normalized.replace(/\s+/g, " ").trim();
    if (normalized === labyrinthCommand) {
      return "labyrinth";
    }
    if (normalized === `${saniCommand} on`) {
      return "sani_on";
    }
    if (normalized === `${saniCommand} off`) {
      return "sani_off";
    }
  }
  return null;
}

export function matchesHeySaniTrigger(text: string): boolean {
  return hasStandaloneTriggerLine(text, HEY_SANI_LINE);
}

export function matchesWhoAmITrigger(text: string): boolean {
  return hasStandaloneTriggerLine(text, WHO_AM_I_LINE);
}

export function matchesExitSaniTrigger(text: string): boolean {
  return hasStandaloneTriggerLine(text, EXIT_SANI_LINE);
}
