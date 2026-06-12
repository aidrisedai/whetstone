import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";

const beat = (code: string) => ({
  label: "🔧 Test beat",
  lang: "html" as const,
  code,
  say: "Here's what this does.",
  isNew: false,
});

describe("assembleBeats", () => {
  it("joins beats in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("line1\n"), beat("line2\n"), beat("line3\n")];

  it("includes beats 0..index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("line1\nline2\n");
  });

  it("includes all beats when index is last", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("line1\nline2\nline3\n");
  });

  it("returns just the first beat for index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("line1\n");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html>\n<html>\n<head></head>\n<body>"),
    beat("<p>Hello</p></body></html>"),
  ];

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for empty string beat", () => {
    expect(beatsFormValidDoc([beat("")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading markdown code fences", () => {
    const input = "```html\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hello</p>");
  });

  it("strips bare triple backtick fences", () => {
    const input = "```\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hello</p>");
  });

  it("passes through clean HTML unchanged", () => {
    const input = "<p>hello</p>";
    expect(cleanGeneratedHtml(input)).toBe("<p>hello</p>");
  });

  it("handles null/undefined gracefully", () => {
    // @ts-expect-error intentional bad input
    expect(cleanGeneratedHtml(null)).toBe("");
    // @ts-expect-error intentional bad input
    expect(cleanGeneratedHtml(undefined)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "<div>hello</div><div>world</div>";

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "hello", replace: "hi" }]);
    expect(code).toBe("<div>hi</div><div>world</div>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits sequentially", () => {
    const { code, applied } = applyEdits(base, [
      { find: "hello", replace: "hi" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("<div>hi</div><div>earth</div>");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when no find string matches", () => {
    const { code, applied } = applyEdits(base, [{ find: "notfound", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const src = "aaa";
    const { code, applied } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips malformed edit objects", () => {
    // @ts-expect-error intentional bad input
    const { code, applied } = applyEdits(base, [null, undefined, { find: "hello", replace: "hi" }]);
    expect(applied).toBe(1);
    expect(code).toContain("hi");
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
