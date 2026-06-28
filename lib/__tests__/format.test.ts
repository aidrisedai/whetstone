import { describe, it, expect } from "vitest";
import { applyEdits, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml } from "../format";
import type { CodeBeat } from "../types";

// ── applyEdits ───────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single exact replacement", () => {
    const { code, applied } = applyEdits("<h1>Hello</h1>", [
      { find: "Hello", replace: "World" },
    ]);
    expect(code).toBe("<h1>World</h1>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "X" },
      { find: "b", replace: "Y" },
    ]);
    expect(code).toBe("XYc");
    expect(applied).toBe(2);
  });

  it("skips an edit whose find string is not found", () => {
    const { code, applied } = applyEdits("abc", [{ find: "zzz", replace: "Q" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("skips edits with an empty find string", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "X" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("only replaces the FIRST occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("handles an empty edits array", () => {
    expect(applyEdits("abc", []).code).toBe("abc");
  });
});

// ── cleanGeneratedHtml ───────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ```", () => {
    const raw = "```html\n<h1>Hi</h1>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<h1>Hi</h1>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\nhello\n```")).toBe("hello");
  });

  it("leaves unfenced text untouched", () => {
    expect(cleanGeneratedHtml("<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

// ── beat assembly ────────────────────────────────────────────────────────────

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    expect(assembleBeats([beat("A"), beat("B"), beat("C")])).toBe("ABC");
  });

  it("returns empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles only beats up to and including the given index", () => {
    expect(assembleBeatsUpTo([beat("A"), beat("B"), beat("C")], 1)).toBe("AB");
  });

  it("assembles the full array when index equals length - 1", () => {
    expect(assembleBeatsUpTo([beat("A"), beat("B")], 1)).toBe("AB");
  });
});

// ── beatsFormValidDoc ────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head>"),
    beat("<body></body></html>"),
  ];

  it("returns true for beats that form a valid HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});
