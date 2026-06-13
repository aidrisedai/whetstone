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
  label: "Beat",
  lang: "html",
  code,
  say: "narration",
  isNew: true,
});

describe("uid", () => {
  it("returns a non-empty string", () => expect(uid()).toBeTruthy());
  it("includes default prefix", () => expect(uid()).toMatch(/^m_/));
  it("includes custom prefix", () => expect(uid("part")).toMatch(/^part_/));
  it("produces unique values", () => expect(uid()).not.toBe(uid()));
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("hello "), beat("world")];
    expect(assembleBeats(beats)).toBe("hello world");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("single beat returns its code", () => {
    expect(assembleBeats([beat("<html>")])).toBe("<html>");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats from 0 to index inclusive", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns all beats when index is last", () => {
    const beats = [beat("x"), beat("y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("xy");
  });

  it("returns single beat at index 0", () => {
    const beats = [beat("only"), beat("not")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("only");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat('<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>'),
  ];

  it("accepts a valid HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("rejects empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("rejects missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("rejects missing closing html tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("rejects missing body tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips opening and closing backtick fences", () => {
    expect(cleanGeneratedHtml("```html\n<div/>\n```")).toBe("<div/>");
  });

  it("strips generic fences without language tag", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("returns plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>hello</p>")).toBe("<p>hello</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("aabbcc", [
      { find: "aa", replace: "XX" },
      { find: "bb", replace: "YY" },
    ]);
    expect(code).toBe("XXYYcc");
    expect(applied).toBe(2);
  });

  it("returns 0 applied when find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aa aa aa", [{ find: "aa", replace: "bb" }]);
    expect(code).toBe("bb aa aa");
  });
});
