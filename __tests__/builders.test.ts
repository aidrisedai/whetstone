import { describe, expect, it } from "vitest";
import { BUILDERS, getBuilder } from "../lib/builders";

describe("BUILDERS", () => {
  it("has bolt, v0, lovable, and claude", () => {
    expect(Object.keys(BUILDERS)).toEqual(["bolt", "v0", "lovable", "claude"]);
  });

  it.each([
    ["bolt", "https://bolt.new/?prompt=Hello%20World"],
    ["v0", "https://v0.app/chat?q=Hello%20World"],
    ["lovable", "https://lovable.dev/?prompt=Hello%20World"],
    ["claude", "https://claude.ai/new?q=Hello%20World"],
  ])("%s buildUrl encodes the prompt", (key, expected) => {
    expect(BUILDERS[key].buildUrl("Hello World")).toBe(expected);
  });
});

describe("getBuilder", () => {
  it("returns the bolt builder by default", () =>
    expect(getBuilder()).toEqual(BUILDERS.bolt));

  it("returns the bolt builder for null", () =>
    expect(getBuilder(null)).toEqual(BUILDERS.bolt));

  it("returns the bolt builder for an unknown key", () =>
    expect(getBuilder("unknown")).toEqual(BUILDERS.bolt));

  it("returns the v0 builder for 'v0'", () =>
    expect(getBuilder("v0")).toEqual(BUILDERS.v0));

  it("returns the lovable builder for 'lovable'", () =>
    expect(getBuilder("lovable")).toEqual(BUILDERS.lovable));

  it("returns the claude builder for 'claude'", () =>
    expect(getBuilder("claude")).toEqual(BUILDERS.claude));
});
