import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "sani",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "sani", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "sani", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "sani", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "sani", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "sani", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "sani", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (dev first)", () => {
    const res = parseCliProfileArgs(["node", "sani", "--dev", "--profile", "work", "status"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (profile first)", () => {
    const res = parseCliProfileArgs(["node", "sani", "--profile", "work", "--dev", "status"]);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join("/home/peter", ".sani-dev");
    expect(env.SANI_PROFILE).toBe("dev");
    expect(env.SANI_STATE_DIR).toBe(expectedStateDir);
    expect(env.SANI_CONFIG_PATH).toBe(path.join(expectedStateDir, "sani.json"));
    expect(env.SANI_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      SANI_STATE_DIR: "/custom",
      SANI_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.SANI_STATE_DIR).toBe("/custom");
    expect(env.SANI_GATEWAY_PORT).toBe("19099");
    expect(env.SANI_CONFIG_PATH).toBe(path.join("/custom", "sani.json"));
  });
});

describe("formatCliCommand", () => {
  it("returns command unchanged when no profile is set", () => {
    expect(formatCliCommand("sani doctor --fix", {})).toBe("sani doctor --fix");
  });

  it("returns command unchanged when profile is default", () => {
    expect(formatCliCommand("sani doctor --fix", { SANI_PROFILE: "default" })).toBe(
      "sani doctor --fix",
    );
  });

  it("returns command unchanged when profile is Default (case-insensitive)", () => {
    expect(formatCliCommand("sani doctor --fix", { SANI_PROFILE: "Default" })).toBe(
      "sani doctor --fix",
    );
  });

  it("returns command unchanged when profile is invalid", () => {
    expect(formatCliCommand("sani doctor --fix", { SANI_PROFILE: "bad profile" })).toBe(
      "sani doctor --fix",
    );
  });

  it("returns command unchanged when --profile is already present", () => {
    expect(
      formatCliCommand("sani --profile work doctor --fix", { SANI_PROFILE: "work" }),
    ).toBe("sani --profile work doctor --fix");
  });

  it("returns command unchanged when --dev is already present", () => {
    expect(formatCliCommand("sani --dev doctor", { SANI_PROFILE: "dev" })).toBe(
      "sani --dev doctor",
    );
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("sani doctor --fix", { SANI_PROFILE: "work" })).toBe(
      "sani --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("sani doctor --fix", { SANI_PROFILE: "  jbsani  " })).toBe(
      "sani --profile jbsani doctor --fix",
    );
  });

  it("handles command with no args after sani", () => {
    expect(formatCliCommand("sani", { SANI_PROFILE: "test" })).toBe(
      "sani --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm sani doctor", { SANI_PROFILE: "work" })).toBe(
      "pnpm sani --profile work doctor",
    );
  });
});
