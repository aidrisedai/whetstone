import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "lbl",
  lang: "html",
  code,
  say: "say",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates beat codes in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });
  it("includes all when index is last", () => {
    const beats = [beat("x"), beat("y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("xy");
  });
  it("returns single beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("z")], 0)).toBe("z");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat('<!DOCTYPE html><html lang="en"><head></head>'),
    beat("<body>hello</body></html>"),
  ];
  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });
  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("aXbXc", [
      { find: "X", replace: "1" },
      { find: "X", replace: "2" },
    ]);
    expect(code).toBe("a1b2c");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "missing", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits("unchanged", []);
    expect(code).toBe("unchanged");
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    expect(cleanGeneratedHtml("```html\n<div/>\n```")).toBe("<div/>");
  });
  it("strips generic code fences", () => {
    expect(cleanGeneratedHtml("```\n<p/>\n```")).toBe("<p/>");
  });
  it("leaves plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<html/>")).toBe("<html/>");
  });
  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <div/>  ")).toBe("<div/>");
  });
  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
