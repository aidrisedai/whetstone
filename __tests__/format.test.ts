import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew,
});

// ── assembleBeats ─────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("includes only beats up to and including index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

const VALID_HTML = `<!DOCTYPE html>
<html>
<head><title>T</title></head>
<body><p>Hello</p></body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("returns true for a well-formed HTML document split across beats", () => {
    const half = Math.floor(VALID_HTML.length / 2);
    const b = [beat(VALID_HTML.slice(0, half)), beat(VALID_HTML.slice(half))];
    expect(beatsFormValidDoc(b)).toBe(true);
  });

  it("returns false when no DOCTYPE", () => {
    const html = "<html><body></body></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when missing closing </html>", () => {
    const html = "<!DOCTYPE html><html><body>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips backtick html fences", () => {
    const input = "```html\n<!DOCTYPE html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html>");
  });

  it("strips plain backtick fences", () => {
    const input = "```\n<div></div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div></div>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single edit", () => {
    const { code, applied } = applyEdits("<p>hello</p>", [
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("<p>world</p>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "A" },
      { find: "c", replace: "C" },
    ]);
    expect(code).toBe("AbC");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("skips edits where find is not found and returns applied count", () => {
    const { code, applied } = applyEdits("<p>hi</p>", [
      { find: "nothere", replace: "x" },
    ]);
    expect(code).toBe("<p>hi</p>");
    expect(applied).toBe(0);
  });

  it("skips invalid/empty edit entries", () => {
    const { applied } = applyEdits("abc", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(applied).toBe(0);
  });

  it("returns 0 applied for empty edits array", () => {
    const { code, applied } = applyEdits("abc", []);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });
});
