import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "chunk",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

describe("assembleBeats", () => {
  it("joins beat code in order", () => {
    const result = assembleBeats([beat("<head>"), beat("<body>"), beat("</body>")]);
    expect(result).toBe("<head><body></body>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C"), beat("D")];

  it("returns the first n+1 beats", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns only the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("returns all beats at last index", () => {
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html>\n<html><head></head>"),
    beat("<body>content"),
    beat("</body></html>"),
  ];

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html fence", () => {
    expect(cleanGeneratedHtml("```html\n<div>test</div>\n```")).toBe("<div>test</div>");
  });

  it("strips leading ``` fence", () => {
    expect(cleanGeneratedHtml("```\n<div>test</div>\n```")).toBe("<div>test</div>");
  });

  it("passes through plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div>test</div>")).toBe("<div>test</div>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <div>test</div>  ")).toBe("<div>test</div>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("handles null-like undefined gracefully via empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const code = `<div class="header">Hello</div><div class="footer">Bye</div>`;

  it("applies a single find-and-replace edit", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
    ]);
    expect(result).toContain("Hi");
    expect(result).not.toContain("Hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
      { find: "Bye", replace: "Farewell" },
    ]);
    expect(result).toContain("Hi");
    expect(result).toContain("Farewell");
    expect(applied).toBe(2);
  });

  it("returns 0 applied when find string is not found", () => {
    const { applied } = applyEdits(code, [{ find: "NotThere", replace: "X" }]);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { applied } = applyEdits(code, [{ find: "", replace: "X" }]);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const c = "aaa";
    const { code: result } = applyEdits(c, [{ find: "a", replace: "b" }]);
    expect(result).toBe("baa");
  });

  it("returns original code when no edits are given", () => {
    const { code: result, applied } = applyEdits(code, []);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });

  it("handles null/undefined edits gracefully", () => {
    // @ts-expect-error testing runtime guard
    const { applied } = applyEdits(code, [null, undefined, { find: "Hello", replace: "Hi" }]);
    expect(applied).toBe(1);
  });
});
