import { describe, it, expect, vi, afterEach } from "vitest";
import { getBuilder, BUILDERS } from "@/lib/builders";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getBuilder", () => {
  it("returns bolt for unknown key", () => {
    expect(getBuilder("unknown")).toEqual(BUILDERS.bolt);
  });
  it("returns bolt when key is null", () => {
    expect(getBuilder(null)).toEqual(BUILDERS.bolt);
  });
  it("returns bolt when key is undefined", () => {
    expect(getBuilder(undefined)).toEqual(BUILDERS.bolt);
  });

  it("returns v0 for 'v0'", () => {
    expect(getBuilder("v0")).toEqual(BUILDERS.v0);
  });
  it("returns lovable for 'lovable'", () => {
    expect(getBuilder("lovable")).toEqual(BUILDERS.lovable);
  });
  it("returns claude for 'claude'", () => {
    expect(getBuilder("claude")).toEqual(BUILDERS.claude);
  });

  it("generates a bolt deep-link with the encoded prompt", () => {
    const url = BUILDERS.bolt.buildUrl("Build a game");
    expect(url).toContain("bolt.new");
    expect(url).toContain(encodeURIComponent("Build a game"));
  });

  it("generates a v0 deep-link with the encoded prompt", () => {
    const url = BUILDERS.v0.buildUrl("Build a UI");
    expect(url).toContain("v0.app");
    expect(url).toContain(encodeURIComponent("Build a UI"));
  });
});
