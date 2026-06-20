import { describe, expect, it } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  applyEdits,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "../format";
import type { CodeBeat } from "../types";

const makeBeat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew: false,
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [makeBeat("a"), makeBeat("b"), makeBeat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("concatenates beats 0 through index (inclusive)", () => {
    const beats = [makeBeat("a"), makeBeat("b"), makeBeat("c")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html>\n<html><head></head><body><p>hi</p></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([makeBeat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing html tag is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<!DOCTYPE html>\n<html><body>")])).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<!DOCTYPE html>\n<html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace edit", () => {
    const result = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(result.code).toBe("hello there");
    expect(result.applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const result = applyEdits("aXbXc", [
      { find: "X", replace: "1" },
      { find: "X", replace: "2" },
    ]);
    expect(result.code).toBe("a1b2c");
    expect(result.applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const result = applyEdits("hello", [{ find: "world", replace: "there" }]);
    expect(result.code).toBe("hello");
    expect(result.applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const result = applyEdits("hello", [{ find: "", replace: "oops" }]);
    expect(result.code).toBe("hello");
    expect(result.applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const result = applyEdits("aaaa", [{ find: "aa", replace: "bb" }]);
    expect(result.code).toBe("bbaa");
    expect(result.applied).toBe(1);
  });

  it("returns original code and 0 applied for empty edits", () => {
    const result = applyEdits("hello", []);
    expect(result.code).toBe("hello");
    expect(result.applied).toBe(0);
  });
});
