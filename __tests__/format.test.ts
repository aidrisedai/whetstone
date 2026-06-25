import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({ label: "step", explanation: "e", code });

describe("assembleBeats", () => {
  it("concatenates code from all beats", () => {
    expect(assembleBeats([beat("foo"), beat("bar")])).toBe("foobar");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles beats 0..index inclusive", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns only the first beat when index is 0", () => {
    expect(assembleBeatsUpTo([beat("x"), beat("y")], 0)).toBe("x");
  });

  it("returns all beats when index is last", () => {
    const beats = [beat("a"), beat("b")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });
});

const VALID_HTML = `<!DOCTYPE html>
<html><head><title>T</title></head><body><p>hello</p></body></html>`;

describe("beatsFormValidDoc", () => {
  it("returns true for a valid HTML document across beats", () => {
    const beats = [beat("<!DOCTYPE html>\n<html><head></head>"), beat("<body></body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("returns false for an empty beat list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when doctype is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ```html...``` fences", () => {
    expect(cleanGeneratedHtml("```html\n<h1>Hello</h1>\n```")).toBe("<h1>Hello</h1>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml(VALID_HTML)).toBe(VALID_HTML);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("<p>old</p>", [{ find: "old", replace: "new" }]);
    expect(code).toBe("<p>new</p>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("a b c", [
      { find: "a", replace: "1" },
      { find: "c", replace: "3" },
    ]);
    expect(code).toBe("1 b 3");
    expect(applied).toBe(2);
  });

  it("skips edits where find string is absent", () => {
    const { code, applied } = applyEdits("hello", [{ find: "world", replace: "!" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips invalid edit objects (empty find)", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "x" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("ba");
  });

  it("returns applied=0 for empty edit list", () => {
    const { code, applied } = applyEdits("original", []);
    expect(code).toBe("original");
    expect(applied).toBe(0);
  });
});
