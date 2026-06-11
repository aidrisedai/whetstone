import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  uid,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

function beat(code: string, isNew = true): CodeBeat {
  return { label: "L", lang: "html", code, say: "s", isNew };
}

describe("uid", () => {
  it("generates unique IDs each call", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });
  it("uses the supplied prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
    expect(uid("a")).toMatch(/^a_/);
  });
  it("defaults to 'm' prefix", () => {
    expect(uid()).toMatch(/^m_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat codes in order", () => {
    const beats = [beat("hello"), beat(" "), beat("world")];
    expect(assembleBeats(beats)).toBe("hello world");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats 0..index", () => {
    const beats = [beat("a"), beat("b"), beat("c"), beat("d")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 3)).toBe("abcd");
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html>
<html>
<head><title>T</title></head>
<body><p>hi</p></body>
</html>`;

  it("returns true for a valid self-contained HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });
  it("returns false for an empty beats list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("returns false when DOCTYPE is missing", () => {
    const doc = `<html><body>hi</body></html>`;
    expect(beatsFormValidDoc([beat(doc)])).toBe(false);
  });
  it("returns false when </html> is missing", () => {
    const doc = `<!DOCTYPE html><html><body>hi</body>`;
    expect(beatsFormValidDoc([beat(doc)])).toBe(false);
  });
  it("returns false when <body is missing", () => {
    const doc = `<!DOCTYPE html><html></html>`;
    expect(beatsFormValidDoc([beat(doc)])).toBe(false);
  });
  it("is tolerant of whitespace after </html>", () => {
    const doc = `<!DOCTYPE html><html><body>hi</body></html>   \n`;
    expect(beatsFormValidDoc([beat(doc)])).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<html/>\n```")).toBe("<html/>");
  });
  it("strips ```html fences", () => {
    expect(cleanGeneratedHtml("```html\n<html/>\n```")).toBe("<html/>");
  });
  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<html/>")).toBe("<html/>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("   <html/>   ")).toBe("<html/>");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("<body>old</body>", [
      { find: "old", replace: "new" },
    ]);
    expect(code).toBe("<body>new</body>");
    expect(applied).toBe(1);
  });
  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("<a><b></b></a>", [
      { find: "<a>", replace: "<div>" },
      { find: "</a>", replace: "</div>" },
    ]);
    expect(code).toBe("<div><b></b></div>");
    expect(applied).toBe(2);
  });
  it("only replaces the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "x" }]);
    expect(code).toBe("xaa");
  });
  it("counts non-matching edits as not applied", () => {
    const { code, applied } = applyEdits("<p>hello</p>", [
      { find: "missing", replace: "x" },
    ]);
    expect(code).toBe("<p>hello</p>");
    expect(applied).toBe(0);
  });
  it("skips invalid edit entries (empty find, missing keys)", () => {
    const { code, applied } = applyEdits("<p>hello</p>", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("<p>hello</p>");
    expect(applied).toBe(0);
  });
  it("returns 0 applied when edits array is empty", () => {
    const { code, applied } = applyEdits("<p>hello</p>", []);
    expect(code).toBe("<p>hello</p>");
    expect(applied).toBe(0);
  });
});
