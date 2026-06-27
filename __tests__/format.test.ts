import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, label = "Part"): CodeBeat => ({
  label,
  lang: "html",
  code,
  say: "",
  isNew: false,
});

describe("assembleBeats", () => {
  it("joins beat code in order", () => {
    expect(assembleBeats([beat("abc"), beat("def")])).toBe("abcdef");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("includes only beats up to the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("includes all beats when index is last", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });

  it("includes only the first beat when index is 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = "<!DOCTYPE html>\n<html><head></head><body><p>Hi</p></body></html>";

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body> tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ``` code fence", () => {
    expect(cleanGeneratedHtml("```\n<html></html>\n```")).toBe("<html></html>");
  });

  it("strips ```html code fence", () => {
    expect(cleanGeneratedHtml("```html\n<html></html>\n```")).toBe("<html></html>");
  });

  it("returns unchanged content with no fences", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
  });

  it("handles null/empty gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("replaces only the first match", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "oops" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "x" },
      { find: "b", replace: "y" },
    ]);
    expect(code).toBe("xyc");
    expect(applied).toBe(2);
  });

  it("returns applied=0 for empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips null/malformed edits", () => {
    const { applied } = applyEdits("hello", [null as unknown as { find: string; replace: string }]);
    expect(applied).toBe(0);
  });
});
