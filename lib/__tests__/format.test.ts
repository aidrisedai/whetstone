import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: "html" | "css" | "js" = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "narration",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index inclusive", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });
  it("returns all beats when index is last", () => {
    const beats = [beat("a"), beat("b")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html><head></head><body></body></html>`;
  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });
  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ```html...``` fences", () => {
    expect(cleanGeneratedHtml("```html\n<div/>\n```")).toBe("<div/>");
  });
  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<div/>\n```")).toBe("<div/>");
  });
  it("passes through unfenced content unchanged", () => {
    expect(cleanGeneratedHtml("  <div/>  ")).toBe("<div/>");
  });
  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies edits in order on the first match only", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("counts misses as zero applied", () => {
    const { applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple edits sequentially", () => {
    const { code } = applyEdits("foo bar baz", [
      { find: "foo", replace: "qux" },
      { find: "baz", replace: "quux" },
    ]);
    expect(code).toBe("qux bar quux");
  });
});
