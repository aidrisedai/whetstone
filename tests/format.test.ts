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
  label: "b",
  lang,
  code,
  say: "s",
  isNew: true,
});

// ── assembleBeats ─────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("A"), beat("B"), beat("C")])).toBe("ABC");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("assembles up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns only the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("returns all beats when index equals last", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validDoc =
    "<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>";

  it("returns true for a valid single-file HTML doc", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when there is no DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when there is no closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when there is no <body", () => {
    expect(
      beatsFormValidDoc([beat("<!DOCTYPE html><html><head></head></html>")]),
    ).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips ```html fences", () => {
    expect(cleanGeneratedHtml("```html\n<div></div>\n```")).toBe("<div></div>");
  });

  it("strips ``` fences (no language tag)", () => {
    expect(cleanGeneratedHtml("```\n<div></div>\n```")).toBe("<div></div>");
  });

  it("returns plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div></div>")).toBe("<div></div>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const code = "hello world foo bar";

  it("applies a single matching edit", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "world", replace: "earth" },
    ]);
    expect(out).toBe("hello earth foo bar");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "hello", replace: "hi" },
      { find: "foo", replace: "baz" },
    ]);
    expect(out).toBe("hi world baz bar");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not present", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "missing", replace: "x" },
    ]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const dup = "aaa";
    const { code: out } = applyEdits(dup, [{ find: "a", replace: "b" }]);
    expect(out).toBe("baa");
  });

  it("skips edits with empty find string", () => {
    const { applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("returns original code and applied=0 for empty edits array", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
});
