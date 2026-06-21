import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew,
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
  it("assembles only beats up to the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
  it("assembles the full array when index is last", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>\n<html><head></head><body>hello</body></html>`;

  it("returns true for a complete HTML doc", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
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
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("aXbYc", [
      { find: "X", replace: "1" },
      { find: "Y", replace: "2" },
    ]);
    expect(code).toBe("a1b2c");
    expect(applied).toBe(2);
  });

  it("applies on the first occurrence only", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits that don't match", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("ignores empty or malformed edit ops", () => {
    const { code, applied } = applyEdits("hello", [
      // @ts-expect-error intentional
      null,
      { find: "", replace: "x" },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<html>\n```")).toBe("<html>");
  });
  it("strips generic code fences", () => {
    expect(cleanGeneratedHtml("```\n<html>\n```")).toBe("<html>");
  });
  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<html>")).toBe("<html>");
  });
  it("handles null/undefined input", () => {
    // @ts-expect-error intentional
    expect(cleanGeneratedHtml(null)).toBe("");
  });
});
