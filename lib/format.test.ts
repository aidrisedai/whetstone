import { describe, it, expect } from "vitest";
import { uid, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml, applyEdits } from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string): CodeBeat => ({
  label: "l",
  lang: "html",
  code,
  say: "say",
  isNew: true,
});

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(0);
  });

  it("uses the supplied prefix", () => {
    expect(uid("x").startsWith("x_")).toBe(true);
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("index 0 returns first beat only", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat("<!DOCTYPE html><html><head></head><body>hello</body></html>"),
  ];

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when doctype is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing html tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing markdown code fences", () => {
    const input = "```html\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("strips plain fences without a language tag", () => {
    expect(cleanGeneratedHtml("```\nhello\n```")).toBe("hello");
  });

  it("passes through clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div>hi</div>")).toBe("<div>hi</div>");
  });

  it("handles null/undefined gracefully", () => {
    // @ts-expect-error testing runtime guard
    expect(cleanGeneratedHtml(null)).toBe("");
    // @ts-expect-error testing runtime guard
    expect(cleanGeneratedHtml(undefined)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies edits in order on the first exact match", () => {
    const { code, applied } = applyEdits("aaa", [
      { find: "a", replace: "b" },
      { find: "a", replace: "c" },
    ]);
    expect(code).toBe("bca");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("ignores malformed edit entries", () => {
    const { code, applied } = applyEdits("hello", [
      // @ts-expect-error testing runtime guard
      null,
      { find: "", replace: "x" },
      { find: "hello", replace: "hi" },
    ]);
    expect(code).toBe("hi");
    expect(applied).toBe(1);
  });

  it("returns original code and 0 applied for an empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
