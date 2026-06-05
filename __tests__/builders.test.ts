import { describe, it, expect } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

describe("getBuilder", () => {
  it("returns bolt by default when key is null/undefined", () => {
    expect(getBuilder(null).key).toBe("bolt");
    expect(getBuilder(undefined).key).toBe("bolt");
    expect(getBuilder("").key).toBe("bolt");
  });

  it("returns the matching builder when a valid key is given", () => {
    expect(getBuilder("v0").key).toBe("v0");
    expect(getBuilder("lovable").key).toBe("lovable");
    expect(getBuilder("claude").key).toBe("claude");
  });

  it("falls back to bolt for unknown keys", () => {
    expect(getBuilder("unknown").key).toBe("bolt");
  });
});

describe("BUILDERS deep-link URLs", () => {
  it("bolt encodes the prompt in the URL", () => {
    const url = BUILDERS.bolt.buildUrl("hello world");
    expect(url).toContain("bolt.new");
    expect(url).toContain("hello%20world");
  });

  it("v0 encodes the prompt in the URL", () => {
    const url = BUILDERS.v0.buildUrl("build a todo app");
    expect(url).toContain("v0.app");
    expect(url).toContain("build%20a%20todo%20app");
  });

  it("lovable encodes the prompt in the URL", () => {
    const url = BUILDERS.lovable.buildUrl("build a chat app");
    expect(url).toContain("lovable.dev");
  });

  it("claude encodes the prompt in the URL", () => {
    const url = BUILDERS.claude.buildUrl("build a game");
    expect(url).toContain("claude.ai");
  });
});
