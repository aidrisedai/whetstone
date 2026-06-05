import { describe, it, expect } from "vitest";
import { applyEdits, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml } from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "Test",
  lang,
  code,
  say: "narration",
  isNew: true,
});

// ── assembleBeats ─────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beats in order", () => {
    expect(assembleBeats([beat("A"), beat("B"), beat("C")])).toBe("ABC");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("includes beats up to and including index", () => {
    expect(assembleBeatsUpTo([beat("A"), beat("B"), beat("C")], 1)).toBe("AB");
  });
  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("A"), beat("B")], 0)).toBe("A");
  });
  it("returns all beats at last index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

const VALID_DOC = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("accepts a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(VALID_DOC)])).toBe(true);
  });
  it("rejects an empty array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("rejects a document missing DOCTYPE", () => {
    const no_doctype = VALID_DOC.replace("<!DOCTYPE html>\n", "");
    expect(beatsFormValidDoc([beat(no_doctype)])).toBe(false);
  });
  it("rejects a document missing closing </html>", () => {
    const no_close = VALID_DOC.replace("</html>", "");
    expect(beatsFormValidDoc([beat(no_close)])).toBe(false);
  });
  it("rejects a document missing <body", () => {
    const no_body = VALID_DOC.replace("<body>", "").replace("</body>", "");
    expect(beatsFormValidDoc([beat(no_body)])).toBe(false);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading code fence", () => {
    expect(cleanGeneratedHtml("```html\n<html></html>")).toBe("<html></html>");
  });
  it("strips trailing code fence", () => {
    expect(cleanGeneratedHtml("<html></html>\n```")).toBe("<html></html>");
  });
  it("strips both fences", () => {
    expect(cleanGeneratedHtml("```html\n<html></html>\n```")).toBe("<html></html>");
  });
  it("handles bare backtick fence", () => {
    expect(cleanGeneratedHtml("```\n<html></html>\n```")).toBe("<html></html>");
  });
  it("does not strip content without fences", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const base = `<h1>Hello</h1><p>World</p>`;

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("<h1>Hi</h1><p>World</p>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(code).toBe("<h1>Hi</h1><p>Earth</p>");
    expect(applied).toBe(2);
  });

  it("only replaces the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found, counts only applied", () => {
    const { code, applied } = applyEdits(base, [{ find: "NotHere", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("returns original code when edits array is empty", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("handles null/undefined edit entries gracefully", () => {
    const { code, applied } = applyEdits(base, [null as unknown as { find: string; replace: string }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
