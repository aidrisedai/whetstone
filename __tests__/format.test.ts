import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, lang: "html" | "css" | "js" = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "narration",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles beats up to and including index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = beat(
    "<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>",
  );

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([validDoc])).toBe(true);
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

  it("returns false when missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves clean HTML alone", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("trims whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("replaces first occurrence of find string", () => {
    const { code, applied } = applyEdits("hello world hello", [
      { find: "hello", replace: "hi" },
    ]);
    expect(code).toBe("hi world hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("aaa", [
      { find: "a", replace: "b" },
      { find: "a", replace: "c" },
    ]);
    // first edit: "baa", second edit: "bca"
    expect(code).toBe("bca");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips malformed edits with empty find", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns unchanged code for empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
