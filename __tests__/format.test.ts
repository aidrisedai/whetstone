import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (label: string, code: string): CodeBeat => ({
  label,
  lang: "html",
  code,
  say: "",
  isNew: false,
});

// ── assembleBeats ──────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [beat("a", "hello "), beat("b", "world")];
    expect(assembleBeats(beats)).toBe("hello world");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ──────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("returns beats 0..index inclusive", () => {
    const beats = [beat("a", "A"), beat("b", "B"), beat("c", "C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns only the first beat for index 0", () => {
    const beats = [beat("a", "A"), beat("b", "B")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

// ── beatsFormValidDoc ──────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validHtml = "<!DOCTYPE html>\n<html><head></head><body><p>hi</p></body></html>";

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat("a", validHtml)])).toBe(true);
  });

  it("returns false when missing DOCTYPE", () => {
    const html = "<html><body></body></html>";
    expect(beatsFormValidDoc([beat("a", html)])).toBe(false);
  });

  it("returns false when missing closing </html>", () => {
    const html = "<!DOCTYPE html><html><body></body>";
    expect(beatsFormValidDoc([beat("a", html)])).toBe(false);
  });

  it("returns false when missing <body>", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(beatsFormValidDoc([beat("a", html)])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

// ── cleanGeneratedHtml ─────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const fenced = "```html\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<div>hi</div>");
  });

  it("strips plain backtick fences", () => {
    const fenced = "```\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<div>hi</div>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<div>hi</div>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
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
    const { code, applied } = applyEdits("aabbcc", [
      { find: "aa", replace: "11" },
      { find: "cc", replace: "33" },
    ]);
    expect(code).toBe("11bb33");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("ab ab ab", [{ find: "ab", replace: "xy" }]);
    expect(code).toBe("xy ab ab");
  });

  it("skips edits where find string is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "missing", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips invalid edits (empty find string)", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns applied=0 for empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
