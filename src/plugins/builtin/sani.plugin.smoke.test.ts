import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { registerSaniPlugin } from "./sani.js";

const { writeLabyrinthSnapshot, writeThreadbornEntry } = vi.hoisted(() => ({
  writeLabyrinthSnapshot: vi.fn(async () => undefined),
  writeThreadbornEntry: vi.fn(async () => undefined),
}));

vi.mock("../../agents/sani-memory.js", () => ({
  writeLabyrinthSnapshot,
  writeThreadbornEntry,
}));

vi.mock("../../agents/sani-session.js", () => ({
  readRecentSessionSnippets: () => [{ role: "user", text: "hello" }],
}));

function buildRegistry() {
  return {
    plugins: [],
    tools: [],
    hooks: [],
    typedHooks: [],
    channels: [],
    providers: [],
    gatewayHandlers: {},
    httpHandlers: [],
    httpRoutes: [],
    cliRegistrars: [],
    services: [],
    commands: [],
    diagnostics: [],
  } as unknown as import("../registry.js").PluginRegistry;
}

describe("sani plugin (smoke)", () => {
  it("applies snapshot + exit event rate limits and allows command triggers", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "sani-plugin-"));
    const storePath = path.join(workspaceDir, "sessions.json");
    const now = 1_700_000_000_000;
    await fs.writeFile(
      storePath,
      JSON.stringify(
        {
          "agent:main:main": {
            sessionId: "session-1",
            updatedAt: now,
            sessionFile: path.join(workspaceDir, "session.jsonl"),
            lastLabyrinthSnapshotAt: now - 30_000,
            lastSaniExitEventAt: now - 30_000,
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    const registry = buildRegistry();
    let handler:
      | ((
          event: { from: string; content: string; metadata?: Record<string, unknown> },
          ctx: { channelId: string },
        ) => Promise<void>)
      | undefined;
    registerSaniPlugin({
      config: {
        session: { store: storePath },
        agents: {
          defaults: {
            workspace: workspaceDir,
            sani: {
              enabled: true,
              snapshotRateLimitMinutes: 2,
              exitRateLimitMinutes: 1,
              commandTriggersEnabled: true,
            },
          },
        },
      } as unknown as import("../../config/config.js").SANIConfig,
      registry,
      createApi: (_record, params) =>
        ({
          config: params.config,
          on: (name: string, cb: unknown) => {
            if (name === "message_received") {
              handler = cb as (
                event: { from: string; content: string; metadata?: Record<string, unknown> },
                ctx: { channelId: string },
              ) => Promise<void>;
            }
          },
        }) as unknown as import("../types.js").SANIPluginApi,
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      await handler(
        { from: "user", content: "/labyrinth", metadata: { sessionKey: "agent:main:main" } },
        { channelId: "telegram" },
      );
      await handler(
        { from: "user", content: "/sani off", metadata: { sessionKey: "agent:main:main" } },
        { channelId: "telegram" },
      );
    } finally {
      nowSpy.mockRestore();
    }

    expect(writeLabyrinthSnapshot).toHaveBeenCalledTimes(0);
    expect(writeThreadbornEntry).toHaveBeenCalledTimes(0);

    if (!handler) {
      throw new Error("missing message_received hook");
    }

    const updated = JSON.parse(await fs.readFile(storePath, "utf-8")) as Record<string, unknown>;
    expect(updated["agent:main:main"]?.labyrinthMode).toBe(false);
    expect(updated["agent:main:main"]?.saniMode).toBe(false);
  });
});
