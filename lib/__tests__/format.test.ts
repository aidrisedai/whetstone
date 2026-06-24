import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: CodeBeat["lang"] = "html", isNew = false): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "narration",
  isNew,
});

describe("assembleBeats", () => {
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("<head>"), beat("<body>"), beat("</body>")])).toBe(
      "<head><body></body>"
    );
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C"), beat("D")];

  it("returns first beat only at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("returns all beats up to and including index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns all beats at last index", () => {
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });
});

describe("beatsFormValidDoc", () => {
  const valid = [
    beat("<!DOCTYPE html><html><head></head><body>"),
    beat("content"),
    beat("</body></html>"),
  ];

  it("returns true for a structurally valid HTML document", () => {
    expect(beatsFormValidDoc(valid)).toBe(true);
  });

  it("returns false with no beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const noDoctype = [beat("<html><head></head><body></body></html>")];
    expect(beatsFormValidDoc(noDoctype)).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    const noClose = [beat("<!DOCTYPE html><html><head></head><body>content</body>")];
    expect(beatsFormValidDoc(noClose)).toBe(false);
  });

  it("returns false when <body> tag is missing", () => {
    const noBody = [beat("<!DOCTYPE html><html><head></head></html>")];
    expect(beatsFormValidDoc(noBody)).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ```", () => {
    const input = "```html\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });

  it("strips plain ``` fences", () => {
    const input = "```\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<div>hello</div>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("handles null-ish input safely", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const html = `<div id="foo">Hello</div><span>World</span>`;

  it("applies a single matching edit", () => {
    const { code, applied } = applyEdits(html, [{ find: "Hello", replace: "Hi" }]);
    expect(applied).toBe(1);
    expect(code).toBe(`<div id="foo">Hi</div><span>World</span>`);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(html, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(applied).toBe(2);
    expect(code).toContain("Hi");
    expect(code).toContain("Earth");
  });

  it("skips edits whose find string is not found", () => {
    const { code, applied } = applyEdits(html, [{ find: "Nonexistent", replace: "x" }]);
    expect(applied).toBe(0);
    expect(code).toBe(html);
  });

  it("returns 0 applied and original code for empty edits array", () => {
    const { code, applied } = applyEdits(html, []);
    expect(applied).toBe(0);
    expect(code).toBe(html);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(html, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
    expect(code).toBe(html);
  });

  it("replaces only the first occurrence", () => {
    const repeat = "abc abc abc";
    const { code, applied } = applyEdits(repeat, [{ find: "abc", replace: "X" }]);
    expect(applied).toBe(1);
    expect(code).toBe("X abc abc");
  });
});
