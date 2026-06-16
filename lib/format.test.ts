import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "label",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

const VALID_HTML =
  "<!DOCTYPE html><html><head><title>T</title></head><body><p>hello</p></body></html>";

describe("uid", () => {
  it("returns a string", () => expect(typeof uid()).toBe("string"));
  it("uses the default m_ prefix", () => expect(uid()).toMatch(/^m_/));
  it("uses a custom prefix", () => expect(uid("test")).toMatch(/^test_/));
  it("generates unique ids", () => {
    const ids = Array.from({ length: 20 }, () => uid());
    expect(new Set(ids).size).toBe(20);
  });
});

describe("assembleBeats", () => {
  it("concatenates code in order", () =>
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc"));
  it("returns empty string for an empty array", () =>
    expect(assembleBeats([])).toBe(""));
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0 through index (inclusive)", () =>
    expect(assembleBeatsUpTo([beat("a"), beat("b"), beat("c")], 1)).toBe("ab"));
  it("returns just beat 0 when index is 0", () =>
    expect(assembleBeatsUpTo([beat("a"), beat("b")], 0)).toBe("a"));
});

describe("beatsFormValidDoc", () => {
  it("returns true for a complete HTML document", () =>
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true));
  it("returns false for a partial HTML snippet", () =>
    expect(beatsFormValidDoc([beat("<div>partial</div>")])).toBe(false));
  it("returns false for an empty beats array", () =>
    expect(beatsFormValidDoc([])).toBe(false));
  it("returns false when DOCTYPE is missing", () =>
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false));
  it("returns false when body tag is missing", () =>
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false));
  it("assembles multiple beats before checking", () => {
    const head = "<!DOCTYPE html><html><body>";
    const tail = "<p>hi</p></body></html>";
    expect(beatsFormValidDoc([beat(head), beat(tail)])).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips html code fences", () =>
    expect(cleanGeneratedHtml("```html\n<h1>hi</h1>\n```")).toBe("<h1>hi</h1>"));
  it("strips plain code fences", () =>
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>"));
  it("passes clean HTML through unchanged", () =>
    expect(cleanGeneratedHtml("<h1>hi</h1>")).toBe("<h1>hi</h1>"));
  it("trims whitespace", () =>
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>"));
  it("returns empty string for null input", () =>
    expect(cleanGeneratedHtml(null as unknown as string)).toBe(""));
});

describe("applyEdits", () => {
  it("replaces the first match", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("reports 0 applied when find is not found", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "missing", replace: "x" }]);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("only replaces the FIRST occurrence (not all)", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("applies multiple edits sequentially", () => {
    const { code, applied } = applyEdits("foo bar", [
      { find: "foo", replace: "baz" },
      { find: "bar", replace: "qux" },
    ]);
    expect(code).toBe("baz qux");
    expect(applied).toBe(2);
  });

  it("skips edits with an empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
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
