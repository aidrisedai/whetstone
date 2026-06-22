import { describe, it, expect } from "vitest";
import { applyEdits, cleanGeneratedHtml, assembleBeats, beatsFormValidDoc } from "../format";
import type { CodeBeat } from "../types";

function beat(code: string, isNew = false): CodeBeat {
  return { label: "L", lang: "html", code, say: "say", isNew };
}

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aa bb aa", [{ find: "aa", replace: "xx" }]);
    expect(code).toBe("xx bb aa");
  });

  it("skips edits whose find string is not present", () => {
    const { code, applied } = applyEdits("hello", [{ find: "missing", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "X" },
      { find: "b", replace: "Y" },
    ]);
    expect(code).toBe("XYc");
    expect(applied).toBe(2);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "x" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits("unchanged", []);
    expect(code).toBe("unchanged");
    expect(applied).toBe(0);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips triple-backtick html fences", () => {
    const result = cleanGeneratedHtml("```html\n<p>hi</p>\n```");
    expect(result).toBe("<p>hi</p>");
  });

  it("strips plain triple-backtick fences", () => {
    const result = cleanGeneratedHtml("```\n<p>hi</p>\n```");
    expect(result).toBe("<p>hi</p>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles empty / whitespace input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml("   ")).toBe("");
  });
});

// ── assembleBeats ─────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates code from all beats in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const VALID = "<!DOCTYPE html><html><body></body></html>";

  it("recognises a valid minimal HTML document", () => {
    expect(beatsFormValidDoc([beat(VALID)])).toBe(true);
  });

  it("rejects empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("rejects a document missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("rejects a document missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("rejects a document missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});
