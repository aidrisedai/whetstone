import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

function beat(code: string, label = ""): CodeBeat {
  return { code, label, concept: "", explanation: "" };
}

// ── assembleBeats ──────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("returns empty string for empty array", () => expect(assembleBeats([])).toBe(""));
  it("returns single beat code", () => expect(assembleBeats([beat("abc")])).toBe("abc"));
  it("concatenates beats in order", () =>
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc"));
});

// ── assembleBeatsUpTo ──────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c"), beat("d")];

  it("returns only first beat at index 0", () =>
    expect(assembleBeatsUpTo(beats, 0)).toBe("a"));
  it("returns beats up to and including given index", () =>
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc"));
  it("returns all beats at last index", () =>
    expect(assembleBeatsUpTo(beats, 3)).toBe("abcd"));
});

// ── beatsFormValidDoc ──────────────────────────────────────────────────────

const VALID_HTML = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("recognises a valid HTML document", () =>
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true));
  it("returns false for empty beats", () =>
    expect(beatsFormValidDoc([])).toBe(false));
  it("returns false when DOCTYPE is missing", () =>
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false));
  it("returns false when </html> is missing", () =>
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false));
  it("returns false when <body is missing", () =>
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false));
});

// ── cleanGeneratedHtml ─────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("passes through plain HTML unchanged", () =>
    expect(cleanGeneratedHtml("<div>hi</div>")).toBe("<div>hi</div>"));
  it("strips ```html ... ``` fences", () =>
    expect(cleanGeneratedHtml("```html\n<div>hi</div>\n```")).toBe("<div>hi</div>"));
  it("strips plain ``` ... ``` fences", () =>
    expect(cleanGeneratedHtml("```\n<div>hi</div>\n```")).toBe("<div>hi</div>"));
  it("handles null/undefined gracefully", () =>
    expect(cleanGeneratedHtml(null as unknown as string)).toBe(""));
  it("trims surrounding whitespace", () =>
    expect(cleanGeneratedHtml("  <p>x</p>  ")).toBe("<p>x</p>"));
});

// ── applyEdits ─────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single edit", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("returns original code and 0 when find not matched", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("a b c", [
      { find: "a", replace: "1" },
      { find: "b", replace: "2" },
    ]);
    expect(code).toBe("1 2 c");
    expect(applied).toBe(2);
  });

  it("only replaces the first occurrence of find", () => {
    const { code, applied } = applyEdits("x x x", [{ find: "x", replace: "y" }]);
    expect(code).toBe("y x x");
    expect(applied).toBe(1);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "boom" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
