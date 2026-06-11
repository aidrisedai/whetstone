import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: "html" | "css" | "js" = "html"): CodeBeat => ({
  label: "beat",
  lang,
  code,
  say: "say",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    expect(assembleBeats([beat("abc"), beat("def")])).toBe("abcdef");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns beats 0..index inclusive", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("x"), beat("y")], 0)).toBe("x");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    "<!DOCTYPE html><html><head></head><body>Hello</body></html>";

  it("returns true for a valid minimal HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
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

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("returns passthrough when no fences", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a find-and-replace on first match only", () => {
    const { code, applied } = applyEdits("aabbaa", [{ find: "aa", replace: "ZZ" }]);
    expect(code).toBe("ZZbbaa");
    expect(applied).toBe(1);
  });

  it("returns 0 applied for no match", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("foo bar", [
      { find: "foo", replace: "baz" },
      { find: "bar", replace: "qux" },
    ]);
    expect(code).toBe("baz qux");
    expect(applied).toBe(2);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
