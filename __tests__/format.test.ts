import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew: true,
});

// ---------------------------------------------------------------------------
// assembleBeats
// ---------------------------------------------------------------------------
describe("assembleBeats", () => {
  it("joins all beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ---------------------------------------------------------------------------
// assembleBeatsUpTo
// ---------------------------------------------------------------------------
describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns just the first beat at index 0", () => {
    const beats = [beat("x"), beat("y")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("x");
  });
});

// ---------------------------------------------------------------------------
// beatsFormValidDoc
// ---------------------------------------------------------------------------
describe("beatsFormValidDoc", () => {
  const validHtml =
    "<!DOCTYPE html><html><head></head><body><p>hello</p></body></html>";

  it("returns true for a valid complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    const lower = "<!doctype html><html><head></head><body></body></HTML>";
    expect(beatsFormValidDoc([beat(lower)])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cleanGeneratedHtml
// ---------------------------------------------------------------------------
describe("cleanGeneratedHtml", () => {
  it("strips a markdown html code fence", () => {
    const input = "```html\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });

  it("strips a generic triple-backtick fence", () => {
    const input = "```\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });

  it("leaves plain HTML untouched", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

// ---------------------------------------------------------------------------
// applyEdits
// ---------------------------------------------------------------------------
describe("applyEdits", () => {
  it("applies a single find-and-replace edit", () => {
    const { code, applied } = applyEdits("<h1>title</h1>", [
      { find: "title", replace: "Hello World" },
    ]);
    expect(code).toBe("<h1>Hello World</h1>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "X" },
      { find: "b", replace: "Y" },
    ]);
    expect(code).toBe("XYc");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aa", [{ find: "a", replace: "Z" }]);
    expect(code).toBe("Za");
  });

  it("returns applied=0 when no match found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips malformed edit entries", () => {
    const { code, applied } = applyEdits("hello", [
      null as unknown as { find: string; replace: string },
      { find: "", replace: "x" },
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("world");
    expect(applied).toBe(1);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits("no change", []);
    expect(code).toBe("no change");
    expect(applied).toBe(0);
  });
});
