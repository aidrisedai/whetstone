import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
  uid,
} from "./format";
import type { CodeBeat } from "./types";

function beat(code: string): CodeBeat {
  return { label: "x", lang: "html", code, say: "", isNew: true };
}

describe("uid", () => {
  it("returns a string with the given prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });

  it("generates unique ids on successive calls", () => {
    const a = uid("t");
    const b = uid("t");
    expect(a).not.toBe(b);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("foo"), beat("bar")])).toBe("foobar");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("returns only the first beat at index 0", () =>
    expect(assembleBeatsUpTo(beats, 0)).toBe("a"));

  it("returns beats 0..1 at index 1", () =>
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab"));

  it("returns all beats at last index", () =>
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc"));
});

describe("beatsFormValidDoc", () => {
  it("returns true for a minimal valid HTML document", () => {
    expect(
      beatsFormValidDoc([beat("<!DOCTYPE html><html><head></head><body></body></html>")]),
    ).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> closing tag is absent", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    expect(
      beatsFormValidDoc([beat("<!doctype html><html><head></head><body></body></HTML>")]),
    ).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ``` html ``` code fences", () => {
    expect(cleanGeneratedHtml("```html\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<p>test</p>\n```")).toBe("<p>test</p>");
  });

  it("leaves clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div>hello</div>")).toBe("<div>hello</div>");
  });

  it("handles empty/null-ish input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("<div>hello</div>", [
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("<div>world</div>");
    expect(applied).toBe(1);
  });

  it("applies only the first occurrence of each find string", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("applies multiple edits sequentially on the mutated string", () => {
    const { code, applied } = applyEdits("aaa", [
      { find: "a", replace: "b" },
      { find: "a", replace: "c" },
    ]);
    expect(code).toBe("bca");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("ignores edits with an empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns the original code unmodified when edits array is empty", () => {
    const { code, applied } = applyEdits("original", []);
    expect(code).toBe("original");
    expect(applied).toBe(0);
  });

  it("handles null/undefined edit entries without throwing", () => {
    const edits = [null as unknown as { find: string; replace: string }];
    expect(() => applyEdits("code", edits)).not.toThrow();
  });
});
