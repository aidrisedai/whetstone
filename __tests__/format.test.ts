import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "Test",
  lang,
  code,
  say: "narration",
  isNew: true,
});

// ── assembleBeats ──────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ──────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("includes beats up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("includes all beats when index is last", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });

  it("returns first beat only at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });
});

// ── beatsFormValidDoc ──────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head><body>"),
    beat("<h1>Hello</h1>"),
    beat("</body></html>"),
  ];

  it("returns true for a valid HTML document", () => {
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

// ── cleanGeneratedHtml ─────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips ```html fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("passes through plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

// ── applyEdits ─────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const code = '<h1 id="title">Hello</h1>';

  it("applies a single edit", () => {
    const { code: result, applied } = applyEdits(code, [{ find: "Hello", replace: "World" }]);
    expect(result).toBe('<h1 id="title">World</h1>');
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello", replace: "World" },
      { find: "title", replace: "heading" },
    ]);
    expect(result).toBe('<h1 id="heading">World</h1>');
    expect(applied).toBe(2);
  });

  it("counts only edits that matched", () => {
    const { applied } = applyEdits(code, [{ find: "NotFound", replace: "X" }]);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code: result } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(result).toBe("baa");
  });

  it("skips edits with empty find string", () => {
    const { code: result, applied } = applyEdits(code, [{ find: "", replace: "X" }]);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });

  it("returns original code when edits array is empty", () => {
    const { code: result, applied } = applyEdits(code, []);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });
});
