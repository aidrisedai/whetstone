import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "say something",
  isNew: false,
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
  it("returns beats up to and including the given index", () => {
    expect(assembleBeatsUpTo([beat("a"), beat("b"), beat("c")], 1)).toBe("ab");
  });
  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("x"), beat("y")], 0)).toBe("x");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = beat(
    "<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>",
  );

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([validDoc])).toBe(true);
  });
  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("returns false for empty array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("strips code fences without language tag", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("leaves plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single exact find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies only the first match when there are duplicates", () => {
    const { code, applied } = applyEdits("aa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("ba");
    expect(applied).toBe(1);
  });

  it("skips edits where find string is not found", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "xyz", replace: "abc" },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("a b c", [
      { find: "a", replace: "1" },
      { find: "b", replace: "2" },
    ]);
    expect(code).toBe("1 2 c");
    expect(applied).toBe(2);
  });

  it("skips malformed edit entries", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
