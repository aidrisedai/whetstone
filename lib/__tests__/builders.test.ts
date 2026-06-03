import { describe, it, expect } from "vitest";
import { BUILDERS, getBuilder } from "../builders";

describe("BUILDERS", () => {
  it("defines bolt, v0, lovable, and claude targets", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it("generates a valid bolt URL with an encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl("hello world");
    expect(url).toBe("https://bolt.new/?prompt=hello%20world");
  });

  it("generates a valid v0 URL", () => {
    const url = BUILDERS.v0.buildUrl("test prompt");
    expect(url).toContain("https://v0.app/chat?q=");
    expect(url).toContain("test%20prompt");
  });

  it("generates a valid lovable URL", () => {
    const url = BUILDERS.lovable.buildUrl("my idea");
    expect(url).toContain("https://lovable.dev/?prompt=");
    expect(url).toContain("my%20idea");
  });

  it("generates a valid claude URL", () => {
    const url = BUILDERS.claude.buildUrl("build me a game");
    expect(url).toContain("https://claude.ai/new?q=");
    expect(url).toContain("build%20me%20a%20game");
  });

  it("URL-encodes special characters", () => {
    const url = BUILDERS.bolt.buildUrl("idea: 50% done & growing");
    expect(url).not.toContain(" ");
    expect(url).not.toContain("&");
  });
});

describe("getBuilder", () => {
  it("returns bolt when key is null", () =>
    expect(getBuilder(null).key).toBe("bolt"));
  it("returns bolt when key is undefined", () =>
    expect(getBuilder(undefined).key).toBe("bolt"));
  it("returns bolt for an unknown key", () =>
    expect(getBuilder("unknown").key).toBe("bolt"));
  it("returns v0 for 'v0'", () => expect(getBuilder("v0").key).toBe("v0"));
  it("returns lovable for 'lovable'", () =>
    expect(getBuilder("lovable").key).toBe("lovable"));
  it("returns claude for 'claude'", () =>
    expect(getBuilder("claude").key).toBe("claude"));
  it("returns bolt for 'bolt'", () =>
    expect(getBuilder("bolt").key).toBe("bolt"));
});
