import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("<!DOCTYPE html>"), beat("<body>"), beat("</body></html>")];

  it("includes beats 0..index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("<!DOCTYPE html><body>");
  });

  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("<!DOCTYPE html>");
  });

  it("returns all beats at last index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("<!DOCTYPE html><body></body></html>");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat("<!DOCTYPE html><html><head></head>"),
    beat("<body><p>Hello</p>"),
    beat("</body></html>"),
  ];

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when missing <body>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips triple backtick html fences", () => {
    const input = "```html\n<h1>Hello</h1>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<h1>Hello</h1>");
  });

  it("strips plain triple backtick fences", () => {
    const input = "```\n<p>test</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>test</p>");
  });

  it("leaves bare HTML unchanged", () => {
    const input = "<p>hello</p>";
    expect(cleanGeneratedHtml(input)).toBe("<p>hello</p>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "function hello() { return 'world'; }";

  it("applies a single edit", () => {
    const { code, applied } = applyEdits(base, [{ find: "world", replace: "earth" }]);
    expect(code).toBe("function hello() { return 'earth'; }");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "hello", replace: "greet" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("function greet() { return 'earth'; }");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "nothere", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const code = "aa-aa";
    const { code: result, applied } = applyEdits(code, [{ find: "aa", replace: "bb" }]);
    expect(result).toBe("bb-aa");
    expect(applied).toBe(1);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
