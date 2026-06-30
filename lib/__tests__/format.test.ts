import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

function beat(code: string): CodeBeat {
  return { label: "test", lang: "html", code, say: "", isNew: false };
}

describe("assembleBeats", () => {
  it("concatenates beats in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("single beat returns its code", () => {
    expect(assembleBeats([beat("hello")])).toBe("hello");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c"), beat("d")];

  it("assembles through the given index (inclusive)", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("assembles only the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });

  it("assembles all beats at last index", () => {
    expect(assembleBeatsUpTo(beats, 3)).toBe("abcd");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head><body>"),
    beat("<p>hello</p>"),
    beat("</body></html>"),
  ];

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    const beats = [beat("<html><body>text</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when closing html tag is absent", () => {
    const beats = [beat("<!DOCTYPE html><html><body>text</body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when body tag is absent", () => {
    const beats = [beat("<!DOCTYPE html><html><head></head></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    const input = "```html\n<p>Hello</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>Hello</p>");
  });

  it("strips plain code fences with no language tag", () => {
    const input = "```\n<p>Hello</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>Hello</p>");
  });

  it("passes through text with no fences unchanged", () => {
    expect(cleanGeneratedHtml("<p>Hello</p>")).toBe("<p>Hello</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>Hello</p>  ")).toBe("<p>Hello</p>");
  });
});

describe("applyEdits", () => {
  it("applies a single replacement", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "there" },
    ]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple replacements in sequence", () => {
    const { code, applied } = applyEdits("aXbXc", [
      { find: "X", replace: "1" },
      { find: "X", replace: "2" },
    ]);
    expect(code).toBe("a1b2c");
    expect(applied).toBe(2);
  });

  it("only replaces the first occurrence per edit", () => {
    const { code, applied } = applyEdits("aXaX", [{ find: "X", replace: "Y" }]);
    expect(code).toBe("aYaX");
    expect(applied).toBe(1);
  });

  it("counts zero applied when no match found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns original string for empty edit list", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
