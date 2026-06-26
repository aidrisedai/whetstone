import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getBuilder, BUILDERS } from "../lib/builders.ts";

describe("BUILDERS registry", () => {
  it("contains bolt, v0, lovable, claude", () => {
    assert.ok("bolt" in BUILDERS);
    assert.ok("v0" in BUILDERS);
    assert.ok("lovable" in BUILDERS);
    assert.ok("claude" in BUILDERS);
  });

  it("every builder has a name, tagline, and buildUrl function", () => {
    for (const [key, b] of Object.entries(BUILDERS)) {
      assert.equal(b.key, key, `${key}.key mismatch`);
      assert.ok(b.name.length > 0, `${key} missing name`);
      assert.ok(b.tagline.length > 0, `${key} missing tagline`);
      assert.equal(typeof b.buildUrl, "function", `${key}.buildUrl is not a function`);
    }
  });
});

describe("getBuilder", () => {
  it("returns bolt for unknown key", () => assert.equal(getBuilder("unknown").key, "bolt"));
  it("returns bolt for null", () => assert.equal(getBuilder(null).key, "bolt"));
  it("returns bolt for undefined", () => assert.equal(getBuilder(undefined).key, "bolt"));
  it("returns the named builder", () => assert.equal(getBuilder("v0").key, "v0"));
  it("returns lovable when requested", () => assert.equal(getBuilder("lovable").key, "lovable"));
  it("returns claude when requested", () => assert.equal(getBuilder("claude").key, "claude"));
});

describe("builder buildUrl", () => {
  it("bolt URL contains encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl("build a todo app");
    assert.ok(url.startsWith("https://bolt.new"), `unexpected bolt URL: ${url}`);
    assert.ok(url.includes(encodeURIComponent("build a todo app")));
  });

  it("v0 URL contains encoded prompt", () => {
    const url = BUILDERS.v0.buildUrl("make a dashboard");
    assert.ok(url.startsWith("https://v0.app"), `unexpected v0 URL: ${url}`);
    assert.ok(url.includes(encodeURIComponent("make a dashboard")));
  });

  it("lovable URL contains encoded prompt", () => {
    const url = BUILDERS.lovable.buildUrl("chat app");
    assert.ok(url.startsWith("https://lovable.dev"), `unexpected lovable URL: ${url}`);
    assert.ok(url.includes(encodeURIComponent("chat app")));
  });

  it("claude URL contains encoded prompt", () => {
    const url = BUILDERS.claude.buildUrl("quiz game");
    assert.ok(url.startsWith("https://claude.ai"), `unexpected claude URL: ${url}`);
    assert.ok(url.includes(encodeURIComponent("quiz game")));
  });

  it("handles special characters in prompt", () => {
    const prompt = "build a game with & symbols + spaces";
    for (const [key, builder] of Object.entries(BUILDERS)) {
      const url = builder.buildUrl(prompt);
      assert.ok(!url.includes(" "), `${key} URL has unencoded space`);
      assert.ok(url.includes("%"), `${key} URL has no encoding`);
    }
  });
});
