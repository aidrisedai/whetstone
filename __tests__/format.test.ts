import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
  uid,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, lang: "html" | "css" | "js" = "html"): CodeBeat => ({
  label: "L",
  lang,
  code,
  say: "say",
  isNew: true,
});

// ── uid ────────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("generates a non-empty string", () => expect(uid()).toBeTruthy());
  it("generates unique values", () => expect(uid()).not.toBe(uid()));
  it("uses the given prefix", () => expect(uid("foo")).toMatch(/^foo_/));
  it("defaults to m_ prefix", () => expect(uid()).toMatch(/^m_/));
});

// ── assembleBeats ──────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("<html>"), beat("<body>"), beat("</body></html>")])).toBe(
      "<html><body></body></html>",
    );
  });
  it("returns empty string for no beats", () => expect(assembleBeats([])).toBe(""));
});

// ── assembleBeatsUpTo ──────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("returns only up to the given index (inclusive)", () =>
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB"));

  it("returns all beats when index is last", () =>
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC"));

  it("returns only first beat for index 0", () =>
    expect(assembleBeatsUpTo(beats, 0)).toBe("A"));
});

// ── beatsFormValidDoc ──────────────────────────────────────────────────────

const VALID_HTML = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>hi</p></body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("returns true for a valid HTML document spread across beats", () => {
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true);
  });

  it("returns false for beats that don't form a complete document", () => {
    expect(beatsFormValidDoc([beat("<div>incomplete</div>")])).toBe(false);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("requires both <!DOCTYPE html> at start and </html> at end", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });
});

// ── cleanGeneratedHtml ─────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips html code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("leaves plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

// ── applyEdits ─────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const base = `<h1>Hello</h1><p>World</p>`;

  it("applies a single find-and-replace correctly", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("<h1>Hi</h1><p>World</p>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(code).toBe("<h1>Hi</h1><p>Earth</p>");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present", () => {
    const { code, applied } = applyEdits(base, [{ find: "Missing", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const code = "aaa";
    const { code: result } = applyEdits(code, [{ find: "a", replace: "b" }]);
    expect(result).toBe("baa");
  });

  it("skips malformed edit entries gracefully", () => {
    const { code, applied } = applyEdits(base, [
      null as unknown as { find: string; replace: string },
      { find: "", replace: "X" },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(applied).toBe(1);
    expect(code).toContain("Hi");
  });

  it("returns unchanged code when edits array is empty", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
