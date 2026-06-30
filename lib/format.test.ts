import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "test",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C"), beat("D")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });

  it("returns first beat only at index 0", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("X");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>`;
  const validBeats = [beat(validHtml)];

  it("returns true for a valid single-file HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false for an empty beats array", () => {
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

describe("cleanGeneratedHtml", () => {
  it("strips json/html code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hello</p>\n```")).toBe("<p>hello</p>");
    expect(cleanGeneratedHtml("```\n<div/>\n```")).toBe("<div/>");
  });

  it("passes through plain html unchanged", () => {
    const html = "<html><body>test</body></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>ok</p>  ")).toBe("<p>ok</p>");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("foo bar baz", [
      { find: "foo", replace: "one" },
      { find: "bar", replace: "two" },
    ]);
    expect(code).toBe("one two baz");
    expect(applied).toBe(2);
  });

  it("replaces only the FIRST occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("counts only edits that found a match", () => {
    const { applied } = applyEdits("hello", [
      { find: "hello", replace: "bye" },
      { find: "nothere", replace: "x" },
    ]);
    expect(applied).toBe(1);
  });

  it("skips invalid edits (empty find, missing fields)", () => {
    const { code, applied } = applyEdits("unchanged", [
      { find: "", replace: "x" },
      { find: "valid", replace: "y" },
    ]);
    expect(code).toBe("unchanged");
    expect(applied).toBe(0);
  });

  it("returns original code untouched when no matches", () => {
    const original = "const x = 1;";
    const { code, applied } = applyEdits(original, [{ find: "notpresent", replace: "y" }]);
    expect(code).toBe(original);
    expect(applied).toBe(0);
  });
});
