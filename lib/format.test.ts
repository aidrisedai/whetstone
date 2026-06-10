import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "./format";
import type { CodeBeat } from "./types";

function beat(code: string): CodeBeat {
  return { label: "test", lang: "html", code, say: "", isNew: true };
}

const FULL_HTML = `<!DOCTYPE html>\n<html>\n<body>\n<p>hi</p>\n</body>\n</html>`;

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
  it("includes beats 0..index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
  it("returns only first beat at index 0", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("X");
  });
});

describe("beatsFormValidDoc", () => {
  it("returns true for a full valid HTML doc split across beats", () => {
    const beats = [beat("<!DOCTYPE html>\n<html>\n<body>"), beat("content"), beat("</body>\n</html>")];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });
  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("returns false when doctype is missing", () => {
    const beats = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
  it("returns false when </html> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html><body></body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
  it("returns false when <body is missing", () => {
    const beats = [beat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
});

describe("applyEdits", () => {
  it("applies a simple replacement", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });
  it("skips edits whose find string is absent", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(FULL_HTML, [
      { find: "<p>hi</p>", replace: "<p>hello</p>" },
      { find: "</body>", replace: "<footer/></body>" },
    ]);
    expect(code).toContain("<p>hello</p>");
    expect(code).toContain("<footer/>");
    expect(applied).toBe(2);
  });
  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "x" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const fenced = "```html\n<!DOCTYPE html>\n</html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html>\n</html>");
  });
  it("strips plain ``` fences", () => {
    const fenced = "```\n<p>hi</p>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<p>hi</p>");
  });
  it("passes through clean HTML unchanged", () => {
    expect(cleanGeneratedHtml(FULL_HTML)).toBe(FULL_HTML);
  });
  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
