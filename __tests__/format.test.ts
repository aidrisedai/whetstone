import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, label = "chunk"): CodeBeat => ({
  code,
  label,
  lang: "html",
  say: "",
  isNew: false,
});

// ── assembleBeats ────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("assembles up to and including the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });

  it("returns empty for an empty array", () => {
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

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const html = "<html><body>hi</body></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when closing </html> tag is missing", () => {
    const html = "<!DOCTYPE html><html><body>hi</body>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    const html = "<!doctype html><html><body>hi</body></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(true);
  });
});

// ── cleanGeneratedHtml ───────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips a triple-backtick html fence", () => {
    const input = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("strips a generic triple-backtick fence", () => {
    const input = "```\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("leaves unfenced HTML untouched", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html><html></html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <div>hi</div>  ")).toBe("<div>hi</div>");
  });
});

// ── applyEdits ───────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const base = `function greet() {\n  return "hello";\n}\n`;

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [
      { find: '"hello"', replace: '"world"' },
    ]);
    expect(applied).toBe(1);
    expect(code).toContain('"world"');
    expect(code).not.toContain('"hello"');
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "greet", replace: "farewell" },
      { find: '"hello"', replace: '"goodbye"' },
    ]);
    expect(applied).toBe(2);
    expect(code).toContain("farewell");
    expect(code).toContain('"goodbye"');
  });

  it("reports 0 applied when find string is not found", () => {
    const { code, applied } = applyEdits(base, [
      { find: "nonexistent", replace: "something" },
    ]);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });

  it("replaces only the first occurrence", () => {
    const text = "a a a";
    const { code, applied } = applyEdits(text, [{ find: "a", replace: "b" }]);
    expect(applied).toBe(1);
    expect(code).toBe("b a a");
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });

  it("skips malformed edit objects", () => {
    const { code, applied } = applyEdits(base, [
      null as unknown as { find: string; replace: string },
      { find: '"hello"', replace: '"ok"' },
    ]);
    expect(applied).toBe(1);
    expect(code).toContain('"ok"');
  });

  it("returns the original code with 0 applied for an empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });
});
