import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({
  code,
  label: "🧠 chunk",
  lang: "html",
  say: "say",
  isNew: false,
});

describe("uid", () => {
  it("generates unique ids each call", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it("uses provided prefix", () => {
    expect(uid("test")).toMatch(/^test_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("abc"), beat("def"), beat("ghi")];
    expect(assembleBeats(beats)).toBe("abcdefghi");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles only up to given index (inclusive)", () => {
    const beats = [beat("a"), beat("b"), beat("c"), beat("d")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });

  it("returns single beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("x")], 0)).toBe("x");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head><body>"),
    beat("<p>hello</p></body></html>"),
  ];

  it("returns true for valid html doc beats", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when no doctype", () => {
    const beats = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when not closed with </html>", () => {
    const beats = [beat("<!DOCTYPE html><html><body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading code fence", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("strips plain code fence", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("passes through clean html unchanged", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  const code = "hello world foo bar";

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "world", replace: "earth" }]);
    expect(out).toBe("hello earth foo bar");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "hello", replace: "hi" },
      { find: "world", replace: "earth" },
    ]);
    expect(out).toBe("hi earth foo bar");
    expect(applied).toBe(2);
  });

  it("skips edits where find not present", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "notfound", replace: "x" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("replaces first occurrence only", () => {
    const { code: out } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(out).toBe("baa");
  });

  it("handles empty edits array", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("skips malformed edit entries", () => {
    const { code: out, applied } = applyEdits(code, [
      null as unknown as { find: string; replace: string },
      { find: "", replace: "x" },
    ]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
});
