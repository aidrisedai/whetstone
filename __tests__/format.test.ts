import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "narration",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles beats 0..index inclusive", () => {
    const beats = [beat("a"), beat("b"), beat("c"), beat("d")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 3)).toBe("abcd");
  });

  it("returns empty string for empty input", () => {
    expect(assembleBeatsUpTo([], 0)).toBe("");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat('<!DOCTYPE html><html lang="en"><head></head>'),
    beat("<body><p>hello</p></body></html>"),
  ];

  it("returns true for a well-formed HTML document across beats", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    const beats = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html><body></body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for empty-string beats", () => {
    expect(beatsFormValidDoc([beat(""), beat("")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ``` fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hello</p>\n```")).toBe("<p>hello</p>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hello</p>\n```")).toBe("<p>hello</p>");
  });

  it("leaves plain HTML untouched", () => {
    const html = "<p>hello</p>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  const base = "<div>hello world</div>";

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "hello", replace: "hi" }]);
    expect(code).toBe("<div>hi world</div>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "hello", replace: "hi" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("<div>hi earth</div>");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("<p>a</p><p>a</p>", [{ find: "<p>a</p>", replace: "<p>b</p>" }]);
    expect(code).toBe("<p>b</p><p>a</p>");
  });

  it("counts applied as 0 when find string not present", () => {
    const { code, applied } = applyEdits(base, [{ find: "nothere", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips null/invalid edit objects", () => {
    const { code, applied } = applyEdits(base, [null as unknown as { find: string; replace: string }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("returns original code for empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("handles edits that insert HTML", () => {
    const { code } = applyEdits("<body></body>", [
      { find: "</body>", replace: '<script>console.log("hi")</script></body>' },
    ]);
    expect(code).toBe('<body><script>console.log("hi")</script></body>');
  });
});
