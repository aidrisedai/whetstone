import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format.ts";
import type { CodeBeat } from "../lib/types.ts";

const beat = (code: string, label = "test"): CodeBeat => ({
  code,
  label,
  lang: "html",
  say: "",
  isNew: false,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    assert.equal(assembleBeats(beats), "<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    assert.equal(assembleBeats([]), "");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats 0..index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    assert.equal(assembleBeatsUpTo(beats, 1), "AB");
  });

  it("index 0 returns just first beat", () => {
    assert.equal(assembleBeatsUpTo([beat("X"), beat("Y")], 0), "X");
  });

  it("index beyond length returns all", () => {
    const beats = [beat("A"), beat("B")];
    assert.equal(assembleBeatsUpTo(beats, 99), "AB");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body><p>hello</p></body></html>`;
  const validBeats = [beat(validDoc)];

  it("accepts a complete HTML document", () => {
    assert.equal(beatsFormValidDoc(validBeats), true);
  });

  it("rejects empty beats", () => {
    assert.equal(beatsFormValidDoc([]), false);
  });

  it("rejects a fragment with no doctype", () => {
    assert.equal(beatsFormValidDoc([beat("<div>hi</div>")]), false);
  });

  it("rejects a doc missing </html>", () => {
    assert.equal(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")]), false);
  });

  it("rejects a doc missing <body", () => {
    assert.equal(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")]), false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    const input = "```html\n<html></html>\n```";
    assert.equal(cleanGeneratedHtml(input), "<html></html>");
  });

  it("strips unnamed code fences", () => {
    const input = "```\n<html></html>\n```";
    assert.equal(cleanGeneratedHtml(input), "<html></html>");
  });

  it("leaves clean HTML untouched", () => {
    assert.equal(cleanGeneratedHtml("<html></html>"), "<html></html>");
  });

  it("handles null/undefined gracefully", () => {
    assert.equal(cleanGeneratedHtml(undefined as unknown as string), "");
  });

  it("trims surrounding whitespace", () => {
    assert.equal(cleanGeneratedHtml("  <p>hi</p>  "), "<p>hi</p>");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "earth" },
    ]);
    assert.equal(code, "hello earth");
    assert.equal(applied, 1);
  });

  it("only replaces first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    assert.equal(code, "baa");
    assert.equal(applied, 1);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    assert.equal(code, "hello");
    assert.equal(applied, 0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("foo bar", [
      { find: "foo", replace: "baz" },
      { find: "bar", replace: "qux" },
    ]);
    assert.equal(code, "baz qux");
    assert.equal(applied, 2);
  });

  it("skips invalid edit objects", () => {
    const { code, applied } = applyEdits("hello", [
      null as unknown as { find: string; replace: string },
      { find: "", replace: "x" },
    ]);
    assert.equal(code, "hello");
    assert.equal(applied, 0);
  });

  it("returns 0 applied for empty edits list", () => {
    const { code, applied } = applyEdits("hello", []);
    assert.equal(code, "hello");
    assert.equal(applied, 0);
  });
});
