import { describe, it, expect } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

// ── applyEdits ────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a simple substitution", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "Whetstone" }]);
    expect(code).toBe("hello Whetstone");
    expect(applied).toBe(1);
  });

  it("only replaces the first occurrence", () => {
    const { code, applied } = applyEdits("a a a", [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("foo bar", [
      { find: "foo", replace: "one" },
      { find: "bar", replace: "two" },
    ]);
    expect(code).toBe("one two");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present", () => {
    const { code, applied } = applyEdits("hello", [{ find: "missing", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns 0 applied for an empty edits array", () => {
    const { code, applied } = applyEdits("unchanged", []);
    expect(code).toBe("unchanged");
    expect(applied).toBe(0);
  });

  it("skips malformed edit objects", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles multi-line find strings", () => {
    const src = "line1\nline2\nline3";
    const { code, applied } = applyEdits(src, [{ find: "line1\nline2", replace: "replaced" }]);
    expect(code).toBe("replaced\nline3");
    expect(applied).toBe(1);
  });
});

// ── assembleBeats ─────────────────────────────────────────────────────────

const htmlBeat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "...",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [htmlBeat("<!DOCTYPE html>"), htmlBeat("<body>"), htmlBeat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    const beats = [htmlBeat("A"), htmlBeat("B"), htmlBeat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────

const FULL_DOC = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<p>Hello</p>
</body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("returns true for a valid HTML document assembled from beats", () => {
    expect(beatsFormValidDoc([htmlBeat(FULL_DOC)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    const doc = "<html><body></body></html>";
    expect(beatsFormValidDoc([htmlBeat(doc)])).toBe(false);
  });

  it("returns false when closing </html> tag is missing", () => {
    const doc = "<!DOCTYPE html><html><body></body>";
    expect(beatsFormValidDoc([htmlBeat(doc)])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    const doc = "<!DOCTYPE html><html></html>";
    expect(beatsFormValidDoc([htmlBeat(doc)])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("validates the assembled file, not individual beats", () => {
    // Split across two beats — still valid together
    const beats = [
      htmlBeat("<!DOCTYPE html><html><body>"),
      htmlBeat("<p>content</p></body></html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips ```html fences", () => {
    expect(cleanGeneratedHtml("```html\n<!DOCTYPE html>\n```")).toBe("<!DOCTYPE html>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<html>\n```")).toBe("<html>");
  });

  it("passes through text with no fences", () => {
    expect(cleanGeneratedHtml("<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});
