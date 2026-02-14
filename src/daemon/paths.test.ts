import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveGatewayStateDir } from "./paths.js";

describe("resolveGatewayStateDir", () => {
  it("uses the default state dir when no overrides are set", () => {
    const env = { HOME: "/Users/test" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".sani"));
  });

  it("appends the profile suffix when set", () => {
    const env = { HOME: "/Users/test", SANI_PROFILE: "rescue" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".sani-rescue"));
  });

  it("treats default profiles as the base state dir", () => {
    const env = { HOME: "/Users/test", SANI_PROFILE: "Default" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".sani"));
  });

  it("uses SANI_STATE_DIR when provided", () => {
    const env = { HOME: "/Users/test", SANI_STATE_DIR: "/var/lib/sani" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/var/lib/sani"));
  });

  it("expands ~ in SANI_STATE_DIR", () => {
    const env = { HOME: "/Users/test", SANI_STATE_DIR: "~/sani-state" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/Users/test/sani-state"));
  });

  it("preserves Windows absolute paths without HOME", () => {
    const env = { SANI_STATE_DIR: "C:\\State\\sani" };
    expect(resolveGatewayStateDir(env)).toBe("C:\\State\\sani");
  });
});
