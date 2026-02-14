#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import JSON5 from "json5";

const defaultConfigPath = path.resolve(process.cwd(), "config/sani.default.json");
const configPath = process.env.SANI_CONFIG_PATH?.trim() || defaultConfigPath;

if (!process.env.SANI_CONFIG_PATH?.trim()) {
  process.env.SANI_CONFIG_PATH = configPath;
}

let saniEnabled = true;
let workspace = "~/.sani/workspace";
try {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON5.parse(raw);
  saniEnabled = parsed?.agents?.defaults?.sani?.enabled === true;
  workspace = parsed?.agents?.defaults?.workspace ?? workspace;
} catch {
  // fall back to defaults shown above
}

const stateLines = [
  "## SANI ACTIVE STATE",
  `configPath: ${configPath}`,
  `saniEnabled: ${saniEnabled ? "true" : "false"}`,
  `workspace: ${workspace}`,
  "",
];
process.stderr.write(`${stateLines.join("\n")}\n`);

const args = process.argv.slice(2);
const child = spawn(process.execPath, ["scripts/run-node.mjs", ...args], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
