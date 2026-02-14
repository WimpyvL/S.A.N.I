import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { matchesHeySaniTrigger, parseSaniCommandTrigger, readSaniSessionFlags } from "./sani.js";

const { threadbornWrite } = vi.hoisted(() => ({
  threadbornWrite: vi.fn(async () => undefined),
}));

vi.mock("./sani-memory.js", () => ({
  writeThreadbornEntry: threadbornWrite,
}));

describe("sani trigger guards", () => {
  it("does not trigger in markdown quote/code/forwarded wrappers", () => {
    expect(matchesHeySaniTrigger("> hey sani")).toBe(false);
    expect(matchesHeySaniTrigger("```\nhey sani\n```\n")).toBe(false);
    expect(matchesHeySaniTrigger("Forwarded message\nhey sani")).toBe(false);
  });

  it("parses explicit command triggers", () => {
    expect(parseSaniCommandTrigger("/sani on")).toBe("sani_on");
    expect(parseSaniCommandTrigger("/sani off")).toBe("sani_off");
    expect(parseSaniCommandTrigger("/labyrinth")).toBe("labyrinth");
  });
});

describe("sani mode ttl", () => {
  afterEach(() => {
    threadbornWrite.mockClear();
  });

  it("auto-clears expired flags and records ttl auto-exit", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "sani-ttl-"));
    const storePath = path.join(workspaceDir, "sessions.json");
    const now = Date.now();
    await fs.writeFile(
      storePath,
      JSON.stringify(
        {
          "agent:main:main": {
            sessionId: "session-1",
            updatedAt: now - 100_000,
            saniMode: true,
            labyrinthMode: true,
            lastModeUpdateAt: now - 120_000,
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    const flags = await readSaniSessionFlags({
      config: {
        session: { store: storePath },
        agents: { defaults: { sani: { modeTtlMinutes: 1 } } },
      },
      sessionKey: "agent:main:main",
      workspaceDir,
      now,
    });

    expect(flags).toEqual({ saniMode: false, labyrinthMode: false });
    const saved = JSON.parse(await fs.readFile(storePath, "utf-8")) as Record<string, unknown>;
    expect(saved["agent:main:main"]?.saniMode).toBe(false);
    expect(saved["agent:main:main"]?.labyrinthMode).toBe(false);
    expect(threadbornWrite).toHaveBeenCalledTimes(1);
    expect(threadbornWrite.mock.calls[0]?.[0]).toMatchObject({
      title: "SANI Auto-Exit (TTL)",
      sourceTrigger: "AUTO_EXIT_TTL",
    });
  });
});
