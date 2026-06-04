import { describe, it, expect } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({
  label: "label",
  lang: "html",
  code,
  say: "say",
  isNew: true,
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies edits in order", () => {
    const { code } = applyEdits("abc", [
      { find: "a", replace: "A" },
      { find: "b", replace: "B" },
    ]);
    expect(code).toBe("ABc");
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("aa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("ba");
    expect(applied).toBe(1);
  });

  it("skips edits whose find string is not present", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "nope" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns beats up to and including index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    '<!DOCTYPE html><html lang="en"><head></head><body>hi</body></html>';

  it("returns true for a valid full document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false if doctype is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body>hi</body></html>")])).toBe(false);
  });

  it("returns false if closing html tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>hi</body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
    expect(beatsFormValidDoc([beat("")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips code fences", () => {
    expect(cleanGeneratedHtml("```html\n<div/>\n```")).toBe("<div/>");
    expect(cleanGeneratedHtml("```\n<div/>\n```")).toBe("<div/>");
  });

  it("leaves already-clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <div/>  ")).toBe("<div/>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});
