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
  say: "",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates beats in order", () => {
    const beats = [beat("abc"), beat("def")];
    expect(assembleBeats(beats)).toBe("abcdef");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats up to and including the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

const validDoc = `<!DOCTYPE html>
<html>
<head><title>T</title></head>
<body><p>hello</p></body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("returns true for a well-formed HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for missing doctype", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false for unclosed html", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for missing body tag", () => {
    expect(
      beatsFormValidDoc([beat("<!DOCTYPE html><html><head></head></html>")]),
    ).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ```html fences", () => {
    const input = "```html\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hello</p>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\ncode\n```")).toBe("code");
  });

  it("leaves unfenced content unchanged", () => {
    expect(cleanGeneratedHtml("<p>plain</p>")).toBe("<p>plain</p>");
  });

  it("handles empty/null-ish input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("replaces the first occurrence of each find string", () => {
    const { code, applied } = applyEdits("hello world hello", [
      { find: "hello", replace: "hi" },
    ]);
    expect(code).toBe("hi world hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("foo bar", [
      { find: "foo", replace: "baz" },
      { find: "bar", replace: "qux" },
    ]);
    expect(code).toBe("baz qux");
    expect(applied).toBe(2);
  });

  it("skips edits where find string is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips malformed edits (empty find)", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns original code with applied=0 for empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
