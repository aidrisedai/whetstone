import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string): CodeBeat => ({
  label: "Test",
  lang: "html",
  code,
  say: "narration",
  isNew: true,
});

// ── assembleBeats ───────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ───────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("includes beats up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeatsUpTo([], 0)).toBe("");
  });
});

// ── beatsFormValidDoc ────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const html = `<html><body>Hi</body></html>`;
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    const html = `<!DOCTYPE html><html><body>Hi</body>`;
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const html = `<!DOCTYPE html><html></html>`;
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    const html = `<!doctype html><html><body>Hi</body></html>`;
    expect(beatsFormValidDoc([beat(html)])).toBe(true);
  });
});

// ── cleanGeneratedHtml ───────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("passes through clean HTML unchanged", () => {
    const html = `<!DOCTYPE html><html></html>`;
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("strips ```html ... ``` fences", () => {
    const input = "```html\n<!DOCTYPE html><html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html><html></html>");
  });

  it("strips plain ``` ... ``` fences", () => {
    const input = "```\n<p>hi</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hi</p>");
  });

  it("handles null/undefined safely", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

// ── applyEdits ───────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("Hello world", [
      { find: "world", replace: "Whetstone" },
    ]);
    expect(code).toBe("Hello Whetstone");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("aaa bbb ccc", [
      { find: "aaa", replace: "AAA" },
      { find: "ccc", replace: "CCC" },
    ]);
    expect(code).toBe("AAA bbb CCC");
    expect(applied).toBe(2);
  });

  it("applies first occurrence only", () => {
    const { code, applied } = applyEdits("foo foo foo", [
      { find: "foo", replace: "bar" },
    ]);
    expect(code).toBe("bar foo foo");
    expect(applied).toBe(1);
  });

  it("skips edits where find string is not found", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "notfound", replace: "x" },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips malformed edits (empty find, null, etc.)", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns original code unmodified if no edits", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles replacement that contains the search string without infinite looping", () => {
    const { code, applied } = applyEdits("foo", [
      { find: "foo", replace: "foobar" },
    ]);
    expect(code).toBe("foobar");
    expect(applied).toBe(1);
  });
});
