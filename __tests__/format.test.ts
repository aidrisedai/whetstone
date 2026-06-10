import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew: true,
});

const VALID_HTML =
  "<!DOCTYPE html><html><head></head><body>Hello</body></html>";

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });
  it("returns an empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0 through index inclusive", () => {
    expect(assembleBeatsUpTo([beat("a"), beat("b"), beat("c")], 1)).toBe("ab");
  });
  it("returns only the first beat for index 0", () => {
    expect(assembleBeatsUpTo([beat("a"), beat("b")], 0)).toBe("a");
  });
  it("returns all beats when index equals last position", () => {
    expect(assembleBeatsUpTo([beat("a"), beat("b")], 1)).toBe("ab");
  });
});

describe("beatsFormValidDoc", () => {
  it("accepts a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true);
  });
  it("rejects plain text", () => {
    expect(beatsFormValidDoc([beat("just text")])).toBe(false);
  });
  it("rejects an empty beat list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("rejects HTML missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("rejects HTML with no closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("accepts a lowercase doctype", () => {
    expect(
      beatsFormValidDoc([beat("<!doctype html><html><head></head><body></body></html>")])
    ).toBe(true);
  });
  it("assembles multiple beats before validating", () => {
    const parts = [
      beat("<!DOCTYPE html><html><head></head>"),
      beat("<body>Hello</body></html>"),
    ];
    expect(beatsFormValidDoc(parts)).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ```html fences", () => {
    expect(cleanGeneratedHtml("```html\n<html></html>\n```")).toBe("<html></html>");
  });
  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<html></html>\n```")).toBe("<html></html>");
  });
  it("leaves clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
  });
  it("handles an empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single edit", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("reports 0 applied when no match is found", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "missing", replace: "x" },
    ]);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("applies multiple edits sequentially", () => {
    const { code, applied } = applyEdits("foo bar baz", [
      { find: "foo", replace: "one" },
      { find: "bar", replace: "two" },
    ]);
    expect(code).toBe("one two baz");
    expect(applied).toBe(2);
  });

  it("skips edits with an empty find string", () => {
    const { applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("handles an empty edit list", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles partial matches correctly", () => {
    const { code } = applyEdits("<div class='old'>text</div>", [
      { find: "class='old'", replace: "class='new'" },
    ]);
    expect(code).toBe("<div class='new'>text</div>");
  });
});
