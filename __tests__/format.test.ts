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
  return { label: "test", lang: "html", code, say: "", isNew: true };
}

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>\n<html lang="en"><head></head><body></body></html>`;
  const validBeats = [beat(validHtml)];

  it("returns true for a complete, valid HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("assembles multiple beats into a single doc check", () => {
    const parts = [
      beat("<!DOCTYPE html><html><head></head>"),
      beat("<body>content</body></html>"),
    ];
    expect(beatsFormValidDoc(parts)).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing markdown code fences", () => {
    const fenced = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("strips generic code fences", () => {
    const fenced = "```\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<p>hello</p>");
  });

  it("passes through plain HTML untouched", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const code = '<body>\n  <h1>Hello</h1>\n  <p>World</p>\n</body>';

  it("applies a single find-and-replace", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
    ]);
    expect(result).toContain("Hi");
    expect(result).not.toContain("Hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(result).toContain("Hi");
    expect(result).toContain("Earth");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "NOTEXIST", replace: "anything" },
    ]);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });

  it("only replaces the FIRST occurrence", () => {
    const repeated = "aaa";
    const { code: result } = applyEdits(repeated, [{ find: "a", replace: "b" }]);
    expect(result).toBe("baa");
  });

  it("skips malformed edits (empty find, wrong types)", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(applied).toBe(1);
    expect(result).toContain("Hi");
  });

  it("handles empty edits array", () => {
    const { code: result, applied } = applyEdits(code, []);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });
});
