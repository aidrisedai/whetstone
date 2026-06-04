import { describe, expect, it } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string): CodeBeat => ({
  label: "l",
  lang: "html",
  code,
  say: "s",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("<a>"), beat("<b>")])).toBe("<a><b>");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("slices inclusive of index", () => {
    expect(assembleBeatsUpTo([beat("a"), beat("b"), beat("c")], 1)).toBe("ab");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html><head></head><body></body></html>`;
  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
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
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<b>hi</b>\n```")).toBe("<b>hi</b>");
  });
  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<b>hi</b>")).toBe("<b>hi</b>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("returns 0 applied when find not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
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

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("ba");
  });
});
