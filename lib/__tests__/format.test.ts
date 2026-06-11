import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string): CodeBeat => ({
  label: "beat",
  lang: "html",
  code,
  say: "",
  isNew: false,
});

// ── assembleBeats ─────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("includes beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns only the first beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("X"), beat("Y")], 0)).toBe("X");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head><body>hello</body></html>"),
  ];

  it("recognises a complete HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("rejects when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("rejects when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("rejects empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("replaces first match and reports applied count", () => {
    const { code, applied } = applyEdits("hello world hello", [
      { find: "hello", replace: "hi" },
    ]);
    expect(code).toBe("hi world hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("aXbYc", [
      { find: "X", replace: "1" },
      { find: "Y", replace: "2" },
    ]);
    expect(code).toBe("a1b2c");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("abc", [{ find: "Z", replace: "!" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "X" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("returns original code when edits array is empty", () => {
    expect(applyEdits("abc", []).code).toBe("abc");
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    expect(cleanGeneratedHtml("```html\n<h1>Hi</h1>\n```")).toBe("<h1>Hi</h1>");
  });

  it("strips plain backtick fences", () => {
    expect(cleanGeneratedHtml("```\n<p>x</p>\n```")).toBe("<p>x</p>");
  });

  it("passes through unfenced HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hello</p>")).toBe("<p>hello</p>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
