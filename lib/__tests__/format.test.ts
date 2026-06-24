import { describe, it, expect } from "vitest";
import { assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml, applyEdits } from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, label = "step"): CodeBeat => ({
  label,
  lang: "html",
  code,
  say: "Teacher narration",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("includes beats 0..index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns only first beat for index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });

  it("returns full string for last index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html>\n<html><head></head><body>hello</body></html>"),
  ];

  it("returns true for a well-formed HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when doctype is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html>\n<html><body>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing markdown fences", () => {
    expect(cleanGeneratedHtml("```html\n<h1>Hello</h1>\n```")).toBe("<h1>Hello</h1>");
  });

  it("strips plain fences without language tag", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>plain</p>")).toBe("<p>plain</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const code = `<h1>Hello</h1>\n<p>World</p>`;

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "Hello", replace: "Goodbye" }]);
    expect(out).toContain("Goodbye");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(out).toContain("Hi");
    expect(out).toContain("Earth");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "NotHere", replace: "Nope" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const src = "a a a";
    const { code: out } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(out).toBe("b a a");
  });
});
