import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

function beat(code: string): CodeBeat {
  return { label: "test", lang: "html", code, say: "test", isNew: true };
}

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("abc"), beat("def"), beat("ghi")])).toBe("abcdefghi");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0 through index (inclusive)", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });

  it("returns empty string when beats array is empty", () => {
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

  it("returns false when DOCTYPE is missing", () => {
    const html = "<html><body><p>Hi</p></body></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    const html = "<!DOCTYPE html><html><body><p>Hi</p></body>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("is case-insensitive on DOCTYPE", () => {
    const html = `<!doctype html><html><body><p>x</p></body></html>`;
    expect(beatsFormValidDoc([beat(html)])).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const fenced = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<html></html>");
  });

  it("strips plain code fences", () => {
    const fenced = "```\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<html></html>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<html><body></body></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <html></html>  ")).toBe("<html></html>");
  });
});

describe("applyEdits", () => {
  const base = `function greet() { return "Hello"; }`;

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe(`function greet() { return "Hi"; }`);
    expect(applied).toBe(1);
  });

  it("applies edits in order on the cumulative result", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "greet", replace: "welcome" },
    ]);
    expect(code).toContain("Hi");
    expect(code).toContain("welcome");
    expect(applied).toBe(2);
  });

  it("only replaces first occurrence", () => {
    const text = "aaa";
    const { code, applied } = applyEdits(text, [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits where find string is not present", () => {
    const { code, applied } = applyEdits(base, [{ find: "NOTHERE", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips malformed edits (empty find, missing fields)", () => {
    const { code, applied } = applyEdits(base, [
      { find: "", replace: "x" },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(applied).toBe(1);
    expect(code).toContain("Hi");
  });

  it("returns 0 applied for an empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
