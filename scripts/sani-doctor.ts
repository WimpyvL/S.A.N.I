#!/usr/bin/env -S node --import tsx

import JSON5 from "json5";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type Result = { ok: boolean; label: string; detail: string; fix?: string };

type SaniConfig = {
  agents?: {
    defaults?: {
      workspace?: string;
      memorySearch?: {
        store?: {
          path?: string;
        };
      };
    };
  };
  session?: {
    store?: string;
  };
};

function resolveUserPath(input: string): string {
  if (input.startsWith("~")) {
    return path.resolve(input.replace(/^~(?=$|[\\/])/, os.homedir()));
  }
  return path.resolve(input);
}

function expandAgentIdToken(input: string, agentId = "main"): string {
  return input.replaceAll("{agentId}", agentId);
}

async function isWritableDirectory(dirPath: string): Promise<boolean> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    const probe = path.join(dirPath, `.sani-doctor-${process.pid}-${Date.now()}.tmp`);
    await fs.writeFile(probe, "ok\n", "utf8");
    await fs.unlink(probe);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const defaultConfigPath = path.resolve(process.cwd(), "config/sani.default.json");
  const configPath = resolveUserPath(process.env.SANI_CONFIG_PATH?.trim() || defaultConfigPath);

  let cfg: SaniConfig = {};
  try {
    cfg = JSON5.parse(await fs.readFile(configPath, "utf8")) as SaniConfig;
  } catch (error) {
    console.error(`❌ Failed to read config: ${configPath}`);
    console.error(`   Fix: ensure the file exists and is valid JSON/JSON5.`);
    console.error(`   ${String(error)}`);
    process.exit(1);
  }

  const workspace = resolveUserPath(cfg.agents?.defaults?.workspace?.trim() || "~/.sani/workspace");
  const memoryStorePath = resolveUserPath(
    expandAgentIdToken(
      cfg.agents?.defaults?.memorySearch?.store?.path?.trim() || "~/.sani/memory/{agentId}.sqlite",
    ),
  );
  const memoryDir = path.dirname(memoryStorePath);
  const sessionStorePath = resolveUserPath(
    expandAgentIdToken(
      cfg.session?.store?.trim() || "~/.sani/agents/{agentId}/sessions/sessions.json",
    ),
  );
  const sessionDir = path.dirname(sessionStorePath);

  const results: Result[] = [];

  try {
    const stat = await fs.stat(workspace);
    results.push({ ok: stat.isDirectory(), label: "workspace exists", detail: workspace });
  } catch {
    results.push({
      ok: false,
      label: "workspace exists",
      detail: workspace,
      fix: `mkdir -p ${JSON.stringify(workspace)}`,
    });
  }

  const saniMdPath = path.join(workspace, "SANI.md");
  try {
    const stat = await fs.stat(saniMdPath);
    results.push({ ok: stat.isFile(), label: "SANI.md present", detail: saniMdPath });
  } catch {
    results.push({
      ok: false,
      label: "SANI.md present",
      detail: saniMdPath,
      fix: `cp docs/reference/templates/SANI.md ${JSON.stringify(saniMdPath)}`,
    });
  }

  const workspaceMemoryDir = path.join(workspace, "memory");
  const memoryTargets = [workspaceMemoryDir, memoryDir];
  for (const target of memoryTargets) {
    const ok = await isWritableDirectory(target);
    results.push({
      ok,
      label: "memory dir writable",
      detail: target,
      fix: ok ? undefined : `mkdir -p ${JSON.stringify(target)} && chmod u+rwx ${JSON.stringify(target)}`,
    });
  }

  const sessionWritable = await isWritableDirectory(sessionDir);
  results.push({
    ok: sessionWritable,
    label: "session store writable",
    detail: sessionStorePath,
    fix: sessionWritable
      ? undefined
      : `mkdir -p ${JSON.stringify(sessionDir)} && chmod u+rwx ${JSON.stringify(sessionDir)}`,
  });

  console.log(`SANI doctor config: ${configPath}`);
  for (const result of results) {
    if (result.ok) {
      console.log(`✅ ${result.label}: ${result.detail}`);
      continue;
    }
    console.log(`❌ ${result.label}: ${result.detail}`);
    if (result.fix) {
      console.log(`   Fix: ${result.fix}`);
    }
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    process.exit(1);
  }
  console.log("\nSANI doctor passed.");
}

await main();
