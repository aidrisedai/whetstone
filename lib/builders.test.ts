import test from "node:test";
import assert from "node:assert/strict";
import { activeBuilder, BUILDERS, getBuilder } from "./builders.ts";

test("getBuilder returns the matching builder by key", () => {
  assert.equal(getBuilder("v0").name, "v0");
  assert.equal(getBuilder("lovable").name, "Lovable");
});

test("getBuilder falls back to bolt for an unknown, null, or missing key", () => {
  assert.equal(getBuilder("nope").key, "bolt");
  assert.equal(getBuilder(null).key, "bolt");
  assert.equal(getBuilder(undefined).key, "bolt");
});

test("every builder's buildUrl percent-encodes the prompt", () => {
  const prompt = "Build a to-do app & sharpen it?";
  for (const builder of Object.values(BUILDERS)) {
    const url = builder.buildUrl(prompt);
    assert.equal(url.includes("&sharpen"), false, `${builder.key} must encode the raw prompt`);
    assert.match(url, /^https:\/\//);
  }
});

test("activeBuilder reads WHETSTONE_BUILDER from the environment", () => {
  const prior = process.env.WHETSTONE_BUILDER;
  try {
    process.env.WHETSTONE_BUILDER = "v0";
    assert.equal(activeBuilder().key, "v0");
    delete process.env.WHETSTONE_BUILDER;
    assert.equal(activeBuilder().key, "bolt");
  } finally {
    if (prior === undefined) delete process.env.WHETSTONE_BUILDER;
    else process.env.WHETSTONE_BUILDER = prior;
  }
});
