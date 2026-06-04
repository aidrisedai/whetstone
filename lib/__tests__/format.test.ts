import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "hi",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates code from all beats in order", () => {
    const beats = [beat("hello "), beat("world")];
    expect(assembleBeats(beats)).toBe("hello world");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });
  it("returns just the first beat for index 0", () => {
    const beats = [beat("a"), beat("b")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    '<!DOCTYPE html><html lang="en"><head></head><body></body></html>';

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });
  it("returns false for an empty beat list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("returns false when </html> closing tag is missing", () => {
    expect(
      beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")]),
    ).toBe(false);
  });
  it("returns false when <body is missing", () => {
    expect(
      beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")]),
    ).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ```html ... ``` fences", () => {
    expect(cleanGeneratedHtml("```html\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });
  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });
  it("returns plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div>hi</div>")).toBe("<div>hi</div>");
  });
  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const code = `<html><body><h1>Hello</h1></body></html>`;

  it("replaces the first exact match", () => {
    const result = applyEdits(code, [{ find: "<h1>Hello</h1>", replace: "<h1>World</h1>" }]);
    expect(result.code).toBe("<html><body><h1>World</h1></body></html>");
    expect(result.applied).toBe(1);
  });

  it("returns applied=0 when the find string is not found", () => {
    const result = applyEdits(code, [{ find: "not-in-code", replace: "x" }]);
    expect(result.applied).toBe(0);
    expect(result.code).toBe(code);
  });

  it("applies multiple edits in sequence", () => {
    const result = applyEdits(code, [
      { find: "<h1>Hello</h1>", replace: "<h1>Hi</h1>" },
      { find: "</body>", replace: "<p>new</p></body>" },
    ]);
    expect(result.applied).toBe(2);
    expect(result.code).toContain("<h1>Hi</h1>");
    expect(result.code).toContain("<p>new</p>");
  });

  it("skips edits with empty find strings", () => {
    const result = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(result.applied).toBe(0);
    expect(result.code).toBe(code);
  });

  it("handles an empty edits array", () => {
    const result = applyEdits(code, []);
    expect(result.applied).toBe(0);
    expect(result.code).toBe(code);
  });
});
