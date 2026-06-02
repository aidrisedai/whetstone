import { describe, it, expect, vi, afterEach } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "./format";
import type { CodeBeat } from "./types";

function beat(code: string, lang: CodeBeat["lang"] = "html"): CodeBeat {
  return { label: "test", lang, code, say: "", isNew: true };
}

describe("uid", () => {
  it("returns a non-empty string with the given prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });
  it("returns unique values on successive calls", () => {
    expect(uid()).not.toBe(uid());
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("abc"), beat("def"), beat("ghi")];
    expect(assembleBeats(beats)).toBe("abcdefghi");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats 0..index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat('<!DOCTYPE html><html><head></head><body>'),
    beat('</body></html>'),
  ];
  it("accepts a well-formed HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });
  it("rejects empty beat list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("rejects a doc missing the DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("rejects a doc missing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("rejects a doc missing <body>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("applyEdits", () => {
  const base = "<p>Hello world</p>";

  it("replaces first exact match", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("<p>Hi world</p>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "world", replace: "there" },
    ]);
    expect(code).toBe("<p>Hi there</p>");
    expect(applied).toBe(2);
  });

  it("counts only edits that actually matched", () => {
    const { applied } = applyEdits(base, [
      { find: "nothere", replace: "x" },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(applied).toBe(1);
  });

  it("returns applied=0 when no edits match", () => {
    const { code, applied } = applyEdits(base, [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips empty find strings", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "oops" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces the FIRST occurrence", () => {
    const src = "a a a";
    const { code } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("passes through clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>clean</p>")).toBe("<p>clean</p>");
  });
  it("trims whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});
