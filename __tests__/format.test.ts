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
  say: "",
  isNew: false,
});

// ---------------------------------------------------------------------------
// assembleBeats
// ---------------------------------------------------------------------------
describe("assembleBeats", () => {
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("joins beat code in order", () => {
    expect(assembleBeats([beat("A"), beat("B"), beat("C")])).toBe("ABC");
  });

  it("does not add separators between beats", () => {
    expect(assembleBeats([beat("<html>"), beat("</html>")])).toBe("<html></html>");
  });
});

// ---------------------------------------------------------------------------
// assembleBeatsUpTo
// ---------------------------------------------------------------------------
describe("assembleBeatsUpTo", () => {
  it("returns only the first beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("A"), beat("B"), beat("C")], 0)).toBe("A");
  });

  it("returns all beats up to and including the index", () => {
    expect(assembleBeatsUpTo([beat("A"), beat("B"), beat("C")], 1)).toBe("AB");
    expect(assembleBeatsUpTo([beat("A"), beat("B"), beat("C")], 2)).toBe("ABC");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeatsUpTo([], 0)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// beatsFormValidDoc
// ---------------------------------------------------------------------------
describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head><body>hello</body></html>"),
  ];

  it("returns true for a well-formed HTML document across beats", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    expect(
      beatsFormValidDoc([beat("<!doctype html><html><body></body></html>")]),
    ).toBe(true);
  });

  it("handles multi-beat valid documents", () => {
    const beats = [
      beat("<!DOCTYPE html><html><head></head>"),
      beat("<body>content</body>"),
      beat("</html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cleanGeneratedHtml
// ---------------------------------------------------------------------------
describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ```", () => {
    expect(cleanGeneratedHtml("```html\n<html></html>\n```")).toBe("<html></html>");
  });

  it("strips leading ``` (no language) and trailing ```", () => {
    expect(cleanGeneratedHtml("```\n<html></html>\n```")).toBe("<html></html>");
  });

  it("returns plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
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
  const base = "Hello World, Hello";

  it("applies a single edit on first match only", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("Hi World, Hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "X" },
      { find: "b", replace: "Y" },
    ]);
    expect(code).toBe("XYc");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not present", () => {
    const { code, applied } = applyEdits("abc", [{ find: "z", replace: "X" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "X" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("skips null/malformed edit entries", () => {
    const edits = [null as unknown as { find: string; replace: string }];
    const { code, applied } = applyEdits("abc", edits);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("handles replacing with empty string (deletion)", () => {
    const { code, applied } = applyEdits("abc", [{ find: "b", replace: "" }]);
    expect(code).toBe("ac");
    expect(applied).toBe(1);
  });

  it("returns original code for empty edits array", () => {
    const { code, applied } = applyEdits("abc", []);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });
});
