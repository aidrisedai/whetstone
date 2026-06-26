import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  code,
  label: "chunk",
  lang: "html",
  say: "here it is",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("<head>"), beat("<body>"), beat("</body></html>")];

  it("returns only the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("<head>");
  });

  it("returns beats 0 through index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("<head><body>");
    expect(assembleBeatsUpTo(beats, 2)).toBe("<head><body></body></html>");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    "<!DOCTYPE html><html><head><title>T</title></head><body><p>hi</p></body></html>";

  it("returns true for a complete HTML document in one beat", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns true for a document split across beats", () => {
    const half1 = "<!DOCTYPE html><html><head></head>";
    const half2 = "<body><p>hello</p></body></html>";
    expect(beatsFormValidDoc([beat(half1), beat(half2)])).toBe(true);
  });

  it("returns false for partial HTML (no doctype)", () => {
    expect(beatsFormValidDoc([beat("<div>hello</div>")])).toBe(false);
  });

  it("returns false for HTML missing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("leaves plain HTML untouched", () => {
    const html = "<div>hello</div>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("strips ```html fences", () => {
    expect(cleanGeneratedHtml("```html\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<p>text</p>\n```")).toBe("<p>text</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = '<div id="box">hello world</div>';

  it("applies a single exact find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: 'id="box"', replace: 'id="container"' }]);
    expect(code).toBe('<div id="container">hello world</div>');
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "hello", replace: "goodbye" },
      { find: "world", replace: "everyone" },
    ]);
    expect(code).toBe('<div id="box">goodbye everyone</div>');
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present", () => {
    const { code, applied } = applyEdits(base, [{ find: "notfound", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence when the find string appears multiple times", () => {
    const code = "aa bb aa";
    const { applied, code: out } = applyEdits(code, [{ find: "aa", replace: "XX" }]);
    expect(out).toBe("XX bb aa");
    expect(applied).toBe(1);
  });

  it("ignores malformed edit entries", () => {
    const { code, applied } = applyEdits(base, [
      null as unknown as { find: string; replace: string },
      { find: "", replace: "nope" }, // empty find
      { find: "hello", replace: "hi" },
    ]);
    expect(applied).toBe(1);
    expect(code).toContain("hi");
  });

  it("returns the original code and applied=0 for an empty edits list", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
