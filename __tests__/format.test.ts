import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

const VALID_HTML = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

describe("assembleBeats", () => {
  it("concatenates code from all beats in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns code up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns entire array when index is last", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("XY");
  });
});

describe("beatsFormValidDoc", () => {
  it("returns true for a complete valid HTML document", () => {
    const beats = [beat(VALID_HTML)];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    const beats = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    const beats = [beat("<!DOCTYPE html><html><body></body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("applies a single edit on first exact match", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple non-overlapping edits in order", () => {
    const { code, applied } = applyEdits("AAA BBB", [
      { find: "AAA", replace: "X" },
      { find: "BBB", replace: "Y" },
    ]);
    expect(code).toBe("X Y");
    expect(applied).toBe(2);
  });

  it("returns 0 applied when none of the finds match", () => {
    const { code, applied } = applyEdits("hello", [{ find: "notfound", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies only the first occurrence when find appears multiple times", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ``` fences", () => {
    const raw = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("strips plain ``` fences", () => {
    const raw = "```\n<div></div>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<div></div>");
  });

  it("leaves clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
