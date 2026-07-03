import { describe, expect, it } from "vitest";
import { applyEdits, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml } from "./format";
import type { CodeBeat } from "./types";

function beat(code: string, overrides: Partial<CodeBeat> = {}): CodeBeat {
  return { label: "beat", lang: "html", code, say: "", isNew: true, ...overrides };
}

describe("assembleBeats / assembleBeatsUpTo", () => {
  const beats = [beat("<a>"), beat("<b>"), beat("<c>")];

  it("concatenates all beats in order", () => {
    expect(assembleBeats(beats)).toBe("<a><b><c>");
  });

  it("concatenates only beats up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("<a>");
    expect(assembleBeatsUpTo(beats, 1)).toBe("<a><b>");
    expect(assembleBeatsUpTo(beats, 2)).toBe("<a><b><c>");
  });
});

describe("beatsFormValidDoc", () => {
  it("is true for a well-formed document assembled from beats", () => {
    const beats = [
      beat("<!DOCTYPE html><html><body"),
      beat("><h1>Hi</h1></body></html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("is false when the doctype, body tag, or closing html tag is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body>no doctype</body></html>")])).toBe(false);
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>unterminated")])).toBe(false);
  });

  it("is false for an empty beat list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips a leading/trailing markdown code fence", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves plain HTML untouched (aside from trimming)", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles null/undefined input", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies each edit's first exact match in order", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "hello", replace: "goodbye" },
      { find: "world", replace: "planet" },
    ]);
    expect(code).toBe("goodbye planet");
    expect(applied).toBe(2);
  });

  it("skips edits whose find text isn't present, without throwing", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "missing", replace: "x" }]);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("skips malformed edit entries", () => {
    const edits = [
      { find: "", replace: "x" },
      { find: "hello", replace: "y" },
    ];
    const { code, applied } = applyEdits("hello world", edits);
    expect(code).toBe("y world");
    expect(applied).toBe(1);
  });

  it("replaces only the first occurrence of a repeated match", () => {
    const { code, applied } = applyEdits("ababab", [{ find: "ab", replace: "X" }]);
    expect(code).toBe("Xabab");
    expect(applied).toBe(1);
  });
});
