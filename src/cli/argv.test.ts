import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "sani", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "sani", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "sani", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "sani", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "sani", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "sani", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "sani", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "sani"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "sani", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "sani", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "sani", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "sani", "status", "--timeout=2500"], "--timeout")).toBe(
      "2500",
    );
    expect(getFlagValue(["node", "sani", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "sani", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "sani", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "sani", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "sani", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "sani", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "sani", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "sani", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "sani", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "sani", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "sani",
      rawArgs: ["node", "sani", "status"],
    });
    expect(nodeArgv).toEqual(["node", "sani", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "sani",
      rawArgs: ["node-22", "sani", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "sani", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "sani",
      rawArgs: ["node-22.2.0.exe", "sani", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "sani", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "sani",
      rawArgs: ["node-22.2", "sani", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "sani", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "sani",
      rawArgs: ["node-22.2.exe", "sani", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "sani", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "sani",
      rawArgs: ["/usr/bin/node-22.2.0", "sani", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "sani", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "sani",
      rawArgs: ["nodejs", "sani", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "sani", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "sani",
      rawArgs: ["node-dev", "sani", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "sani", "node-dev", "sani", "status"]);

    const directArgv = buildParseArgv({
      programName: "sani",
      rawArgs: ["sani", "status"],
    });
    expect(directArgv).toEqual(["node", "sani", "status"]);

    const bunArgv = buildParseArgv({
      programName: "sani",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "sani",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "sani", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "sani", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "sani", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "sani", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "sani", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "sani", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "sani", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "sani", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
