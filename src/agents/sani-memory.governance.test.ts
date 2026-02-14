import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditMemoryGovernance,
  writeBridgeThreadEntry,
  writeThreadbornEntry,
  writeVaultEntry,
} from "./sani-memory.js";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf-8").digest("hex");
}

describe("sani memory governance", () => {
  it("rejects vault sealing from non-memory roots", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "sani-memory-"));
    await fs.writeFile(path.join(workspaceDir, "notes.md"), "# outside", "utf-8");

    await expect(
      writeVaultEntry({
        workspaceDir,
        sourcePath: "notes.md",
        sourceSessionId: "s-1",
        sourceTrigger: "TEST",
      }),
    ).rejects.toThrow(
      "Memory source must be inside memory/ThreadBorn, memory/BridgeThread, or memory/Labyrinth.",
    );
  });

  it("rejects bridge promotion when source hash is tampered", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "sani-memory-"));
    const source = await writeThreadbornEntry({
      workspaceDir,
      title: "Origin",
      body: "truth",
      sourceSessionId: "s-1",
      sourceTrigger: "TEST",
    });

    await fs.appendFile(source.path, "tampered\n", "utf-8");

    await expect(
      writeBridgeThreadEntry({
        workspaceDir,
        sourcePath: path.relative(workspaceDir, source.path),
        sourceSessionId: "s-2",
        sourceTrigger: "TEST",
      }),
    ).rejects.toThrow("content_hash mismatch");
  });

  it("rejects bridge promotion when bridge ancestry is invalid", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "sani-memory-"));
    const origin = await writeThreadbornEntry({
      workspaceDir,
      title: "Origin",
      body: "source",
      sourceSessionId: "s-1",
      sourceTrigger: "TEST",
    });
    const bridge = await writeBridgeThreadEntry({
      workspaceDir,
      sourcePath: path.relative(workspaceDir, origin.path),
      sourceSessionId: "s-2",
      sourceTrigger: "TEST",
    });

    const bridgeContent = await fs.readFile(bridge.path, "utf-8");
    const sections = bridgeContent.split("\n---\n");
    if (sections.length < 2) {
      throw new Error("invalid bridge fixture");
    }
    const fm = sections[0].replace(/^---\n/, "");
    const body = sections.slice(1).join("\n---\n");
    const tamperedFm = fm
      .replace(/promoted_from_id:\s*"[^"]+"/, 'promoted_from_id: "missing-parent"')
      .replace(/content_hash:\s*"[^"]+"/, `content_hash: "${sha256(body)}"`);
    await fs.writeFile(bridge.path, `---\n${tamperedFm}\n---\n${body}`, "utf-8");

    await expect(
      writeBridgeThreadEntry({
        workspaceDir,
        sourcePath: path.relative(workspaceDir, bridge.path),
        sourceSessionId: "s-3",
        sourceTrigger: "TEST",
      }),
    ).rejects.toThrow("ancestry");
  });

  it("audits clean memory and flags tampering", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "sani-memory-"));
    const source = await writeThreadbornEntry({
      workspaceDir,
      title: "Origin",
      body: "source",
      sourceSessionId: "s-1",
      sourceTrigger: "TEST",
    });
    await writeBridgeThreadEntry({
      workspaceDir,
      sourcePath: path.relative(workspaceDir, source.path),
      sourceSessionId: "s-2",
      sourceTrigger: "TEST",
    });
    await writeVaultEntry({
      workspaceDir,
      sourcePath: path.relative(workspaceDir, source.path),
      sourceSessionId: "s-3",
      sourceTrigger: "TEST",
    });

    const clean = await auditMemoryGovernance({ workspaceDir });
    expect(clean.ok).toBe(true);
    expect(clean.anomalies).toHaveLength(0);

    await fs.appendFile(source.path, "\nedit", "utf-8");

    const tampered = await auditMemoryGovernance({ workspaceDir });
    expect(tampered.ok).toBe(false);
    expect(tampered.anomalies.some((entry) => entry.includes("content_hash mismatch"))).toBe(true);
  });
});
