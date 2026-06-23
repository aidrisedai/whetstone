import { describe, it, expect } from "vitest";
import { assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, applyEdits, cleanGeneratedHtml } from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("returns beats up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat("<!DOCTYPE html><html><head></head><body>hello</body></html>"),
  ];

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing html tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("applies a single edit", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("a b c", [
      { find: "a", replace: "1" },
      { find: "b", replace: "2" },
    ]);
    expect(code).toBe("1 2 c");
    expect(applied).toBe(2);
  });

  it("skips invalid edit entries", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
      // @ts-expect-error — testing runtime robustness
      null,
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<div>hi</div>\n```")).toBe("<div>hi</div>");
    expect(cleanGeneratedHtml("```\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <div>  ")).toBe("<div>");
  });

  it("returns the input unchanged when no fences", () => {
    expect(cleanGeneratedHtml("<div>hi</div>")).toBe("<div>hi</div>");
  });
});
