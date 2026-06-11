import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string): CodeBeat => ({ label: "Part", lang: "html", code, say: "", isNew: false });

// ── assembleBeats ────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("concatenates beat code in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });
});

// ── assembleBeatsUpTo ────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C"), beat("D")];

  it("includes only beats 0..index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });
});

// ── beatsFormValidDoc ────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body>hello</body></html>`;

  it("accepts a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("rejects empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("rejects content without doctype", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("rejects content without closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("rejects content without <body>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

// ── cleanGeneratedHtml ───────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    const input = "```html\n<h1>Hello</h1>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<h1>Hello</h1>");
  });

  it("strips bare backtick fences", () => {
    expect(cleanGeneratedHtml("```\ncode\n```")).toBe("code");
  });

  it("leaves plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<h1>Hi</h1>")).toBe("<h1>Hi</h1>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("   <p>hello</p>   ")).toBe("<p>hello</p>");
  });
});

// ── applyEdits ───────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single find-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("aaa bbb", [
      { find: "aaa", replace: "111" },
      { find: "bbb", replace: "222" },
    ]);
    expect(code).toBe("111 222");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("foo foo foo", [{ find: "foo", replace: "bar" }]);
    expect(code).toBe("bar foo foo");
    expect(applied).toBe(1);
  });

  it("returns applied=0 when no match found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips invalid edit entries", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
