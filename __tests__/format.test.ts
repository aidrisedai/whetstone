import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, partial = false): CodeBeat => ({
  code,
  narration: "explain",
  partial,
  spotlightLines: [],
});

describe("assembleBeats", () => {
  it("joins beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns empty string for empty beats", () => {
    expect(assembleBeatsUpTo([], 0)).toBe("");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const noDoctype = "<html><body></body></html>";
    expect(beatsFormValidDoc([beat(noDoctype)])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    const noClose = "<!DOCTYPE html><html><body></body>";
    expect(beatsFormValidDoc([beat(noClose)])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const noBody = "<!DOCTYPE html><html></html>";
    expect(beatsFormValidDoc([beat(noBody)])).toBe(false);
  });

  it("accepts DOCTYPE case-insensitively", () => {
    const lowerDoctype = "<!doctype html><html><body></body></html>";
    expect(beatsFormValidDoc([beat(lowerDoctype)])).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips a markdown html code fence", () => {
    const fenced = "```html\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<p>hello</p>");
  });

  it("strips a generic code fence", () => {
    const fenced = "```\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<p>hello</p>");
  });

  it("leaves plain HTML untouched", () => {
    const html = "<p>hello</p>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("replaces the first occurrence of find with replace", () => {
    const { code, applied } = applyEdits("hello world hello", [
      { find: "hello", replace: "hi" },
    ]);
    expect(code).toBe("hi world hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence on the running string", () => {
    const { code, applied } = applyEdits("a b c", [
      { find: "a", replace: "x" },
      { find: "b", replace: "y" },
    ]);
    expect(code).toBe("x y c");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "goodbye", replace: "hi" },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns unchanged code for an empty edits array", () => {
    const original = "no changes";
    const { code, applied } = applyEdits(original, []);
    expect(code).toBe(original);
    expect(applied).toBe(0);
  });

  it("handles null/undefined edits gracefully", () => {
    const { code, applied } = applyEdits("hello", [
      null as unknown as { find: string; replace: string },
      { find: "hello", replace: "hi" },
    ]);
    expect(code).toBe("hi");
    expect(applied).toBe(1);
  });
});
