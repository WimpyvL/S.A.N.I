import { describe, expect, it } from "vitest";
import { getVesselArg, rewriteUpdateFlagArgv } from "./run-main.js";

describe("rewriteUpdateFlagArgv", () => {
  it("leaves argv unchanged when --update is absent", () => {
    const argv = ["node", "entry.js", "status"];
    expect(rewriteUpdateFlagArgv(argv)).toBe(argv);
  });

  it("rewrites --update into the update command", () => {
    expect(rewriteUpdateFlagArgv(["node", "entry.js", "--update"])).toEqual([
      "node",
      "entry.js",
      "update",
    ]);
  });

  it("preserves global flags that appear before --update", () => {
    expect(rewriteUpdateFlagArgv(["node", "entry.js", "--profile", "p", "--update"])).toEqual([
      "node",
      "entry.js",
      "--profile",
      "p",
      "update",
    ]);
  });

  it("keeps update options after the rewritten command", () => {
    expect(rewriteUpdateFlagArgv(["node", "entry.js", "--update", "--json"])).toEqual([
      "node",
      "entry.js",
      "update",
      "--json",
    ]);
  });
});

describe("getVesselArg", () => {
  it("returns null when --vessel is absent", () => {
    expect(getVesselArg(["node", "entry.js", "status"])).toBeNull();
  });

  it("parses --vessel=value form", () => {
    expect(getVesselArg(["node", "entry.js", "--vessel=cli"])).toBe("cli");
  });

  it("parses --vessel value form", () => {
    expect(getVesselArg(["node", "entry.js", "--vessel", "web"])).toBe("web");
  });
});
