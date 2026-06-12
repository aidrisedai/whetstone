import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "",
  isNew: false,
});

// ── assembleBeats ──────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ──────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("assembles only beats up to and including index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("includes the final beat when index equals last", () => {
    const beats = [beat("a"), beat("b")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns just first beat at index 0", () => {
    const beats = [beat("hello"), beat("world")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("hello");
  });
});

// ── beatsFormValidDoc ──────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>\n<html>\n<head></head>\n<body><p>hi</p></body>\n</html>`;

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const noDoctype = `<html><body></body></html>`;
    expect(beatsFormValidDoc([beat(noDoctype)])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    const incomplete = `<!DOCTYPE html>\n<html>\n<body>`;
    expect(beatsFormValidDoc([beat(incomplete)])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    const noBody = `<!DOCTYPE html>\n<html>\n</html>`;
    expect(beatsFormValidDoc([beat(noBody)])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    const lower = `<!doctype html>\n<html>\n<body></body>\n</html>`;
    expect(beatsFormValidDoc([beat(lower)])).toBe(true);
  });
});

// ── cleanGeneratedHtml ─────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading code fence", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("strips plain code fence without language", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("passes through clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

// ── applyEdits ─────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("aaa", [
      { find: "a", replace: "b" }, // replaces first 'a'
      { find: "a", replace: "c" }, // replaces next first 'a' in 'baa'
    ]);
    expect(code).toBe("bca");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not found", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "xyz", replace: "abc" },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns applied=0 for empty edits", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips malformed edit objects", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },             // empty find
      null as unknown as { find: string; replace: string }, // null
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("aba", [{ find: "a", replace: "x" }]);
    expect(code).toBe("xba");
    expect(applied).toBe(1);
  });
});
