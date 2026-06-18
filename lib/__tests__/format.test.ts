import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, label = "Block"): CodeBeat => ({
  label,
  lang: "html",
  code,
  say: "",
  isNew: true,
});

// ---------------------------------------------------------------------------
// assembleBeats
// ---------------------------------------------------------------------------
describe("assembleBeats", () => {
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("concatenates beats in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("preserves whitespace between beats", () => {
    expect(assembleBeats([beat("<html>"), beat("\n<body>")])).toBe("<html>\n<body>");
  });
});

// ---------------------------------------------------------------------------
// assembleBeatsUpTo
// ---------------------------------------------------------------------------
describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("returns only the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });

  it("returns all beats up to and including index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

// ---------------------------------------------------------------------------
// beatsFormValidDoc
// ---------------------------------------------------------------------------
const validDoc = `<!DOCTYPE html>
<html>
<head><title>T</title></head>
<body><p>Hello</p></body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const noDoctype = validDoc.replace("<!DOCTYPE html>\n", "");
    expect(beatsFormValidDoc([beat(noDoctype)])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    const noClose = validDoc.replace("</html>", "");
    expect(beatsFormValidDoc([beat(noClose)])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const noBody = validDoc.replace("<body>", "").replace("</body>", "");
    expect(beatsFormValidDoc([beat(noBody)])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    const upper = validDoc.replace("<!DOCTYPE html>", "<!doctype html>");
    expect(beatsFormValidDoc([beat(upper)])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cleanGeneratedHtml
// ---------------------------------------------------------------------------
describe("cleanGeneratedHtml", () => {
  it("returns plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
  });

  it("strips ```html ... ``` fences", () => {
    expect(cleanGeneratedHtml("```html\n<html></html>\n```")).toBe("<html></html>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<html></html>\n```")).toBe("<html></html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <html></html>  ")).toBe("<html></html>");
  });
});

// ---------------------------------------------------------------------------
// applyEdits
// ---------------------------------------------------------------------------
describe("applyEdits", () => {
  it("returns the original code unchanged when no edits match", () => {
    const { code, applied } = applyEdits("<html>foo</html>", [
      { find: "bar", replace: "baz" },
    ]);
    expect(code).toBe("<html>foo</html>");
    expect(applied).toBe(0);
  });

  it("applies a single matching edit", () => {
    const { code, applied } = applyEdits("<html>foo</html>", [
      { find: "foo", replace: "bar" },
    ]);
    expect(code).toBe("<html>bar</html>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "x" },
      { find: "b", replace: "y" },
    ]);
    expect(code).toBe("xyc");
    expect(applied).toBe(2);
  });

  it("only replaces the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "x" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("handles empty code string", () => {
    const { code, applied } = applyEdits("", [{ find: "a", replace: "b" }]);
    expect(code).toBe("");
    expect(applied).toBe(0);
  });

  it("returns code unchanged for empty edits array", () => {
    const { code, applied } = applyEdits("abc", []);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });
});
