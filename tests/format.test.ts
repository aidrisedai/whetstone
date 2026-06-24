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
  label: "🧪 test",
  lang: "html",
  code,
  say: "test narration",
  isNew: true,
});

describe("uid", () => {
  it("returns a string starting with the given prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid("x")));
    expect(ids.size).toBe(100);
  });

  it("defaults prefix to 'm'", () => {
    expect(uid()).toMatch(/^m_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("AAA"), beat("BBB"), beat("CCC")];
    expect(assembleBeats(beats)).toBe("AAABBBCCC");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns only the first beat at index 0", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html>
<html><head></head><body><p>Hello</p></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for a fragment without doctype", () => {
    expect(beatsFormValidDoc([beat("<div>Hello</div>")])).toBe(false);
  });

  it("returns false for an incomplete document missing closing tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading markdown fences", () => {
    expect(cleanGeneratedHtml("```html\n<div/>\n```")).toBe("<div/>");
  });

  it("strips plain fences without a language tag", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("passes through clean HTML", () => {
    expect(cleanGeneratedHtml("<p>hello</p>")).toBe("<p>hello</p>");
  });

  it("handles null/undefined gracefully", () => {
    // @ts-expect-error testing runtime safety
    expect(cleanGeneratedHtml(null)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace edit", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("aaa bbb ccc", [
      { find: "aaa", replace: "111" },
      { find: "bbb", replace: "222" },
    ]);
    expect(code).toBe("111 222 ccc");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("x x x", [{ find: "x", replace: "y" }]);
    expect(code).toBe("y x x");
    expect(applied).toBe(1);
  });

  it("counts missed edits (find not present) as unapplied", () => {
    const { applied } = applyEdits("hello", [{ find: "missing", replace: "nope" }]);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits("unchanged", []);
    expect(code).toBe("unchanged");
    expect(applied).toBe(0);
  });
});
