import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

function beat(code: string): CodeBeat {
  return { code, label: "", lang: "html", say: "", isNew: false };
}

// ─── assembleBeats ────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<html>"), beat("</html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><html></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ─── assembleBeatsUpTo ────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("includes beats from 0 to index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C"), beat("D")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns just the first beat at index 0", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("X");
  });
});

// ─── beatsFormValidDoc ────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const VALID_HTML = "<!DOCTYPE html><html><head></head><body>Hello</body></html>";

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false if DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body>hi</body></html>")])).toBe(false);
  });

  it("returns false if </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>hi</body>")])).toBe(false);
  });

  it("returns false if <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE check", () => {
    const html = "<!doctype html><html><body>hi</body></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(true);
  });
});

// ─── cleanGeneratedHtml ───────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html fence and trailing ``` fence", () => {
    const fenced = "```html\n<!DOCTYPE html><html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html><html></html>");
  });

  it("strips generic ``` fences", () => {
    const fenced = "```\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<div>hello</div>");
  });

  it("leaves plain HTML unchanged", () => {
    const plain = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(plain)).toBe(plain);
  });

  it("handles null/undefined gracefully by treating as empty", () => {
    // @ts-expect-error deliberate wrong type
    expect(cleanGeneratedHtml(null)).toBe("");
    // @ts-expect-error deliberate wrong type
    expect(cleanGeneratedHtml(undefined)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <div></div>  ")).toBe("<div></div>");
  });
});

// ─── applyEdits ───────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("Hello World", [
      { find: "World", replace: "Earth" },
    ]);
    expect(code).toBe("Hello Earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("aaa bbb ccc", [
      { find: "aaa", replace: "AAA" },
      { find: "bbb", replace: "BBB" },
    ]);
    expect(code).toBe("AAA BBB ccc");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when no find strings match", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aaaa", [{ find: "aa", replace: "BB" }]);
    expect(code).toBe("BBaa");
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips malformed edit entries", () => {
    // @ts-expect-error deliberate wrong type
    const { code, applied } = applyEdits("hello", [null, undefined, { find: "ello", replace: "i" }]);
    expect(code).toBe("hi");
    expect(applied).toBe(1);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
