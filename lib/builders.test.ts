import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder, activeBuilder } from "./builders";

describe("BUILDERS", () => {
  it("contains the four supported targets", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("generates correct bolt deep-link", () => {
    const url = BUILDERS.bolt.buildUrl("make a game");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("make a game"));
  });

  it("generates correct v0 deep-link", () => {
    const url = BUILDERS.v0.buildUrl("build a dashboard");
    expect(url).toContain("v0.");
    expect(url).toContain(encodeURIComponent("build a dashboard"));
  });

  it("generates correct lovable deep-link", () => {
    const url = BUILDERS.lovable.buildUrl("chat app");
    expect(url).toContain("lovable.dev");
  });

  it("generates correct claude deep-link", () => {
    const url = BUILDERS.claude.buildUrl("quiz me");
    expect(url).toContain("claude.ai");
  });
});

describe("getBuilder", () => {
  it("returns bolt as the default for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });

  it("returns bolt for null", () => {
    expect(getBuilder(null).key).toBe("bolt");
  });

  it("returns the requested builder", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });
});

describe("activeBuilder", () => {
  it("defaults to bolt when WHETSTONE_BUILDER is unset", () => {
    delete process.env.WHETSTONE_BUILDER;
    expect(activeBuilder().key).toBe("bolt");
  });
});
