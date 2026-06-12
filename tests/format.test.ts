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

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "say",
  isNew,
});

describe("uid", () => {
  it("generates unique ids per call", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it("uses provided prefix", () => {
    expect(uid("part")).toMatch(/^part_/);
    expect(uid("m")).toMatch(/^m_/);
  });

  it("defaults to 'm' prefix", () => {
    expect(uid()).toMatch(/^m_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml =
    "<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>";

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const fenced = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<html></html>");
  });

  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("passes through clean HTML unchanged", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles empty input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("aabbcc", [
      { find: "aa", replace: "XX" },
      { find: "bb", replace: "YY" },
    ]);
    expect(code).toBe("XXYYcc");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("abab", [{ find: "ab", replace: "XY" }]);
    expect(code).toBe("XYab");
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips malformed edits", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns 0 applied for empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
