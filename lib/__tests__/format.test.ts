import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "beat",
  lang,
  code,
  say: "narration",
  isNew: true,
});

const VALID_HTML =
  "<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>";

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("<html>"), beat("<body>"), beat("</body></html>")])).toBe(
      "<html><body></body></html>",
    );
  });

  it("returns an empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("handles a single beat", () => {
    expect(assembleBeats([beat("only")])).toBe("only");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C"), beat("D")];

  it("assembles only up to index 0 (first beat)", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("assembles up to index 1", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("assembles all beats when index equals last", () => {
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });
});

describe("beatsFormValidDoc", () => {
  it("returns true for a complete, valid HTML document", () => {
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is absent", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false when <body is absent", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    const lower = VALID_HTML.replace("<!DOCTYPE html>", "<!doctype html>");
    expect(beatsFormValidDoc([beat(lower)])).toBe(true);
  });

  it("works when the doc is spread across multiple beats", () => {
    const parts = [
      beat("<!DOCTYPE html><html>"),
      beat("<body>hello</body>"),
      beat("</html>"),
    ];
    expect(beatsFormValidDoc(parts)).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ```html ... ``` fences", () => {
    expect(cleanGeneratedHtml("```html\n<div>hello</div>\n```")).toBe("<div>hello</div>");
  });

  it("strips plain ``` ... ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<div>hello</div>\n```")).toBe("<div>hello</div>");
  });

  it("leaves clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div>hello</div>")).toBe("<div>hello</div>");
  });

  it("handles an empty string without throwing", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  it("applies a single edit", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("foo bar baz", [
      { find: "foo", replace: "one" },
      { find: "bar", replace: "two" },
    ]);
    expect(code).toBe("one two baz");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when no edit matches", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("skips edits with an empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("a later edit sees the result of the previous edit", () => {
    const { code } = applyEdits("one two", [
      { find: "one", replace: "ONE" },
      { find: "ONE two", replace: "done" },
    ]);
    expect(code).toBe("done");
  });

  it("handles an empty edits array gracefully", () => {
    const { code, applied } = applyEdits("original", []);
    expect(code).toBe("original");
    expect(applied).toBe(0);
  });
});
