import { describe, expect, it } from "vitest";
import { applyEdits, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml } from "./format";
import type { CodeBeat } from "./types";

function beat(code: string, overrides: Partial<CodeBeat> = {}): CodeBeat {
  return { label: "beat", lang: "html", code, say: "", isNew: true, ...overrides };
}

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns an empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });
});

describe("beatsFormValidDoc", () => {
  it("is true for a well-formed HTML document", () => {
    const beats = [beat("<!DOCTYPE html><html><body>hi</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("is false when missing a doctype, body, or closing html tag", () => {
    expect(beatsFormValidDoc([beat("<html><body>hi</body></html>")])).toBe(false);
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>hi</body>")])).toBe(false);
  });

  it("is false for an empty set of beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("trims plain text with no fences", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles null-ish input", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies each edit's first exact match, in order", () => {
    const result = applyEdits("hello world", [
      { find: "hello", replace: "goodbye" },
      { find: "world", replace: "moon" },
    ]);
    expect(result).toEqual({ code: "goodbye moon", applied: 2 });
  });

  it("skips edits whose find text is not present", () => {
    const result = applyEdits("hello world", [{ find: "missing", replace: "x" }]);
    expect(result).toEqual({ code: "hello world", applied: 0 });
  });

  it("skips malformed edits", () => {
    const result = applyEdits("hello", [
      { find: "", replace: "x" },
      undefined as unknown as { find: string; replace: string },
    ]);
    expect(result).toEqual({ code: "hello", applied: 0 });
  });

  it("only replaces the first occurrence of a repeated find", () => {
    const result = applyEdits("aa", [{ find: "a", replace: "b" }]);
    expect(result).toEqual({ code: "ba", applied: 1 });
  });
});
