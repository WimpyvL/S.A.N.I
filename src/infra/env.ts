import { createSubsystemLogger } from "../logging/subsystem.js";
import { parseBooleanValue } from "../utils/boolean.js";

const log = createSubsystemLogger("env");
const loggedEnv = new Set<string>();

type AcceptedEnvOption = {
  key: string;
  description: string;
  value?: string;
  redact?: boolean;
};

function formatEnvValue(value: string, redact?: boolean): string {
  if (redact) {
    return "<redacted>";
  }
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 160) {
    return singleLine;
  }
  return `${singleLine.slice(0, 160)}…`;
}

export function logAcceptedEnvOption(option: AcceptedEnvOption): void {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }
  if (loggedEnv.has(option.key)) {
    return;
  }
  const rawValue = option.value ?? process.env[option.key];
  if (!rawValue || !rawValue.trim()) {
    return;
  }
  loggedEnv.add(option.key);
  log.info(`env: ${option.key}=${formatEnvValue(rawValue, option.redact)} (${option.description})`);
}

export function normalizeZaiEnv(): void {
  if (!process.env.ZAI_API_KEY?.trim() && process.env.Z_AI_API_KEY?.trim()) {
    process.env.ZAI_API_KEY = process.env.Z_AI_API_KEY;
  }
}

export function isTruthyEnvValue(value?: string): boolean {
  return parseBooleanValue(value) === true;
}

export function normalizeSaniEnv(): void {
  const envMapping: Record<string, string> = {
    SANI_STATE_DIR: "SANI_STATE_DIR",
    SANI_CONFIG_PATH: "SANI_CONFIG_PATH",
    SANI_OAUTH_DIR: "SANI_OAUTH_DIR",
    SANI_GATEWAY_PORT: "SANI_GATEWAY_PORT",
    SANI_NIX_MODE: "SANI_NIX_MODE",
    SANI_PATH_BOOTSTRAPPED: "SANI_PATH_BOOTSTRAPPED",
    SANI_NO_RESPAWN: "SANI_NO_RESPAWN",
    SANI_NODE_OPTIONS_READY: "SANI_NODE_OPTIONS_READY",
  };

  for (const [legacy, sani] of Object.entries(envMapping)) {
    if (!process.env[sani]?.trim() && process.env[legacy]?.trim()) {
      process.env[sani] = process.env[legacy];
    }
  }
}

export function normalizeEnv(): void {
  normalizeZaiEnv();
  normalizeSaniEnv();
}
