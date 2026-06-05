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
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew: true,
});

// ── assembleBeats ──────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates all beats in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("handles a single beat", () => {
    expect(assembleBeats([beat("<html>")])).toBe("<html>");
  });
});

// ── assembleBeatsUpTo ──────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c"), beat("d")];

  it("assembles up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("assembles only index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });

  it("assembles all when index is last", () => {
    expect(assembleBeatsUpTo(beats, 3)).toBe("abcd");
  });
});

// ── beatsFormValidDoc ──────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const VALID = `<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>`;
  const VALID_BEATS = [beat(VALID)];

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc(VALID_BEATS)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

// ── cleanGeneratedHtml ─────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips triple-backtick fences", () => {
    const fenced = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<html></html>");
  });

  it("leaves clean HTML untouched", () => {
    const clean = "<html></html>";
    expect(cleanGeneratedHtml(clean)).toBe(clean);
  });

  it("handles plain ``` fences (no language tag)", () => {
    const fenced = "```\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<html></html>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <html></html>  ")).toBe("<html></html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

// ── applyEdits ─────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const code = `const x = 1;\nconst y = 2;\nconst z = 3;`;

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "const x = 1;", replace: "const x = 10;" }]);
    expect(out).toContain("const x = 10;");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "const x = 1;", replace: "const x = 10;" },
      { find: "const y = 2;", replace: "const y = 20;" },
    ]);
    expect(out).toContain("const x = 10;");
    expect(out).toContain("const y = 20;");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "MISSING", replace: "X" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "", replace: "X" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const repeated = "aaa";
    const { code: out } = applyEdits(repeated, [{ find: "a", replace: "b" }]);
    expect(out).toBe("baa");
  });

  it("returns original code with 0 applied when edits array is empty", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("handles null/undefined edits gracefully", () => {
    const { code: out, applied } = applyEdits(code, [null as unknown as { find: string; replace: string }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
});
