import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "narration",
  isNew: false,
});

describe("assembleBeats", () => {
  it("concatenates in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index inclusive", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
  it("returns single beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("only")], 0)).toBe("only");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><body></body></html>"),
  ];
  const missingDoctype = [beat("<html><body></body></html>")];
  const missingClose = [beat("<!DOCTYPE html><html><body></body>")];

  it("returns true for a valid document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });
  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc(missingDoctype)).toBe(false);
  });
  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc(missingClose)).toBe(false);
  });
  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips HTML code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("leaves clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });
  it("handles empty / whitespace input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml("  \n  ")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a simple find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits with no match and keeps running", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "notfound", replace: "x" },
      { find: "hello", replace: "hi" },
    ]);
    expect(code).toBe("hi");
    expect(applied).toBe(1);
  });

  it("returns applied=0 when nothing matches", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips malformed edit ops", () => {
    // @ts-expect-error intentional bad input
    const { code, applied } = applyEdits("hello", [null, { find: "", replace: "x" }, { find: "hello", replace: "hi" }]);
    expect(code).toBe("hi");
    expect(applied).toBe(1);
  });
});
