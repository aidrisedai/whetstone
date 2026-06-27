import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, id = "b1"): CodeBeat => ({
  id,
  partIndex: 0,
  beatIndex: 0,
  label: "",
  narration: "",
  code,
});

describe("assembleBeats", () => {
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("concatenates code in order", () => {
    const beats = [beat("aaa", "b1"), beat("bbb", "b2"), beat("ccc", "b3")];
    expect(assembleBeats(beats)).toBe("aaabbbccc");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a", "b1"), beat("b", "b2"), beat("c", "b3")];

  it("includes only the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });

  it("includes up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>
<html>
<head><title>T</title></head>
<body><p>Hello</p></body>
</html>`;

  it("returns true for a well-formed HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const noDoctype = `<html><body>hi</body></html>`;
    expect(beatsFormValidDoc([beat(noDoctype)])).toBe(false);
  });

  it("returns false when closing </html> tag is missing", () => {
    const noClose = `<!DOCTYPE html><html><body>hi</body>`;
    expect(beatsFormValidDoc([beat(noClose)])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const noBody = `<!DOCTYPE html><html></html>`;
    expect(beatsFormValidDoc([beat(noBody)])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("passes through plain HTML unchanged", () => {
    const html = `<!DOCTYPE html><html><body>hi</body></html>`;
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("strips a ```html ... ``` fence", () => {
    const fenced = "```html\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<p>hello</p>");
  });

  it("strips a ``` ... ``` fence with no language tag", () => {
    const fenced = "```\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<p>hello</p>");
  });

  it("handles null/undefined safely", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "there" },
    ]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("aaa bbb ccc", [
      { find: "aaa", replace: "111" },
      { find: "bbb", replace: "222" },
    ]);
    expect(code).toBe("111 222 ccc");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("foo foo foo", [
      { find: "foo", replace: "bar" },
    ]);
    expect(code).toBe("bar foo foo");
    expect(applied).toBe(1);
  });

  it("skips edits where the find string is not found", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "nothere", replace: "x" },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with an empty find string", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns the original code and 0 for an empty edits array", () => {
    const { code, applied } = applyEdits("original", []);
    expect(code).toBe("original");
    expect(applied).toBe(0);
  });

  it("handles null/malformed edit objects gracefully", () => {
    const { code, applied } = applyEdits("hello", [
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
