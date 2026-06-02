import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../format";
import type { CodeBeat } from "../types";

// ── helpers ───────────────────────────────────────────────────────────────────

function beat(code: string, lang: CodeBeat["lang"] = "html"): CodeBeat {
  return { label: "test", lang, code, say: "", isNew: true };
}

const VALID_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

// ── assembleBeats ─────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("concatenates code of all beats in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });

  it("preserves whitespace between beats exactly", () => {
    const beats = [beat("line1\n"), beat("line2\n")];
    expect(assembleBeats(beats)).toBe("line1\nline2\n");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("returns only the first beat for index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("returns first two beats for index 1", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns all beats for last index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  it("returns true for a complete, valid HTML doc", () => {
    const beats = VALID_HTML.split("</head>").map((part, i) =>
      beat(i === 0 ? part + "</head>" : part),
    );
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const beats = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html><body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("accepts a single-beat valid doc", () => {
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true);
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("returns original code when edits array is empty", () => {
    expect(applyEdits("hello world", [])).toEqual({ code: "hello world", applied: 0 });
  });

  it("applies a single exact replacement", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies only the first match when find is ambiguous", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("applies multiple non-overlapping edits in sequence", () => {
    const { code, applied } = applyEdits("foo bar baz", [
      { find: "foo", replace: "one" },
      { find: "baz", replace: "three" },
    ]);
    expect(code).toBe("one bar three");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is absent", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips null/malformed edit entries", () => {
    const { code, applied } = applyEdits("hello", [null as unknown as { find: string; replace: string }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("counts only the edits that actually landed", () => {
    const { applied } = applyEdits("abc", [
      { find: "a", replace: "X" },
      { find: "z", replace: "Y" }, // won't land
    ]);
    expect(applied).toBe(1);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("passes through clean HTML unchanged", () => {
    expect(cleanGeneratedHtml(VALID_HTML)).toBe(VALID_HTML);
  });

  it("strips a leading ```html fence and trailing ``` fence", () => {
    const fenced = "```html\n" + VALID_HTML + "\n```";
    expect(cleanGeneratedHtml(fenced)).toBe(VALID_HTML);
  });

  it("strips a leading ``` fence (no language tag)", () => {
    const fenced = "```\n" + VALID_HTML + "\n```";
    expect(cleanGeneratedHtml(fenced)).toBe(VALID_HTML);
  });

  it("returns empty string for empty input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("handles null-ish input gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});
