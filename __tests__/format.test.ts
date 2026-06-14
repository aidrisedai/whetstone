import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, lang: "html" | "css" | "js" = "html"): CodeBeat => ({
  label: "beat",
  lang,
  code,
  say: "narration",
  isNew: false,
});

describe("assembleBeats", () => {
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("concatenates beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><body></body></html>");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns only the first beat when index=0", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("returns all beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns empty string for empty beats", () => {
    expect(assembleBeatsUpTo([], 0)).toBe("");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head>"),
    beat("<body><p>hello</p></body></html>"),
  ];

  it("returns true for a complete HTML document across multiple beats", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const beats = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when </html> closing tag is absent", () => {
    const beats = [beat("<!DOCTYPE html><html><body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
});

describe("applyEdits", () => {
  const code = "<p>Hello world</p><p>Goodbye world</p>";

  it("returns unchanged code and applied=0 for empty edits list", () => {
    const result = applyEdits(code, []);
    expect(result.code).toBe(code);
    expect(result.applied).toBe(0);
  });

  it("applies a single find-and-replace", () => {
    const result = applyEdits(code, [{ find: "Hello", replace: "Hi" }]);
    expect(result.code).toBe("<p>Hi world</p><p>Goodbye world</p>");
    expect(result.applied).toBe(1);
  });

  it("applies only the first occurrence of a match", () => {
    const result = applyEdits(code, [{ find: "world", replace: "earth" }]);
    expect(result.code).toBe("<p>Hello earth</p><p>Goodbye world</p>");
    expect(result.applied).toBe(1);
  });

  it("skips edits where find is not found, returns applied count for matches only", () => {
    const result = applyEdits(code, [
      { find: "NotHere", replace: "x" },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(result.applied).toBe(1);
    expect(result.code).toContain("Hi world");
  });

  it("applies multiple edits sequentially", () => {
    const result = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
      { find: "Goodbye", replace: "Bye" },
    ]);
    expect(result.code).toBe("<p>Hi world</p><p>Bye world</p>");
    expect(result.applied).toBe(2);
  });

  it("skips malformed edits with empty find", () => {
    const result = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(result.applied).toBe(0);
    expect(result.code).toBe(code);
  });
});

describe("cleanGeneratedHtml", () => {
  it("returns clean HTML unchanged", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("strips a ```html ... ``` code fence", () => {
    const fenced = "```html\n<!DOCTYPE html><html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html><html></html>");
  });

  it("strips a plain ``` ... ``` code fence", () => {
    const fenced = "```\n<!DOCTYPE html><html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html><html></html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});
