import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

// ── assembleBeats ──────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates all beats in order", () => {
    expect(assembleBeats([beat("<a>"), beat("<b>"), beat("<c>")])).toBe("<a><b><c>");
  });

  it("returns empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ──────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns just the first beat when index is 0", () => {
    expect(assembleBeatsUpTo([beat("X"), beat("Y")], 0)).toBe("X");
  });

  it("returns all beats when index equals last index", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
});

// ── beatsFormValidDoc ──────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head><body>"),
    beat("<p>hello</p>"),
    beat("</body></html>"),
  ];

  it("returns true for a well-formed HTML document split across beats", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    const noDt = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(noDt)).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    const noClose = [beat("<!DOCTYPE html><html><body></body>")];
    expect(beatsFormValidDoc(noClose)).toBe(false);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when <body> is absent", () => {
    const noBody = [beat("<!DOCTYPE html><html><head></head></html>")];
    expect(beatsFormValidDoc(noBody)).toBe(false);
  });
});

// ── cleanGeneratedHtml ─────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ``` fences", () => {
    const input = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("strips plain ``` fences (no language tag)", () => {
    const input = "```\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("returns clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <html></html>  ")).toBe("<html></html>");
  });
});

// ── applyEdits ─────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single edit at the first match", () => {
    const { code, applied } = applyEdits("<div>old</div>", [
      { find: "old", replace: "new" },
    ]);
    expect(code).toBe("<div>new</div>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("foo bar baz", [
      { find: "foo", replace: "FOO" },
      { find: "baz", replace: "BAZ" },
    ]);
    expect(code).toBe("FOO bar BAZ");
    expect(applied).toBe(2);
  });

  it("reports applied = 0 when no match is found", () => {
    const { code, applied } = applyEdits("no match here", [
      { find: "xyz", replace: "abc" },
    ]);
    expect(code).toBe("no match here");
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence of each find string", () => {
    const { code } = applyEdits("aa aa", [{ find: "aa", replace: "bb" }]);
    expect(code).toBe("bb aa");
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits("unchanged", []);
    expect(code).toBe("unchanged");
    expect(applied).toBe(0);
  });
});
