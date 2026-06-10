import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  applyEdits,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const makeBeat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [makeBeat("a"), makeBeat("b"), makeBeat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [makeBeat("A"), makeBeat("B"), makeBeat("C")];

  it("assembles up to the given index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("handles index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("handles last index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    '<!DOCTYPE html><html lang="en"><head></head><body></body></html>';

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([makeBeat(validDoc)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing html tag is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips triple-backtick html fences", () => {
    const input = "```html\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });

  it("strips generic triple-backtick fences", () => {
    const input = "```\n<p>hi</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hi</p>");
  });

  it("passes through clean HTML unchanged", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles null-ish input gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const html = '<div id="app">hello world</div>';

  it("applies a single exact-match edit", () => {
    const { code, applied } = applyEdits(html, [
      { find: "hello world", replace: "goodbye world" },
    ]);
    expect(code).toBe('<div id="app">goodbye world</div>');
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(html, [
      { find: "hello", replace: "hey" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe('<div id="app">hey earth</div>');
    expect(applied).toBe(2);
  });

  it("skips edits where find string is not found", () => {
    const { code, applied } = applyEdits(html, [
      { find: "not-present", replace: "anything" },
    ]);
    expect(code).toBe(html);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const source = "a a a";
    const { code } = applyEdits(source, [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
  });

  it("skips malformed edits (empty find)", () => {
    const { code, applied } = applyEdits(html, [{ find: "", replace: "x" }]);
    expect(code).toBe(html);
    expect(applied).toBe(0);
  });
});
