import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (label: string, code: string): CodeBeat => ({
  label,
  code,
  explanation: "",
  spotlight: [],
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    const beats = [beat("a", "AAA"), beat("b", "BBB")];
    expect(assembleBeats(beats)).toBe("AAABBB");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a", "A"), beat("b", "B"), beat("c", "C")];

  it("assembles only up to the given index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html>
<html>
<head><title>App</title></head>
<body><p>Hello</p></body>
</html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat("full", validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("x", "<html><body>hi</body></html>")])).toBe(false);
  });

  it("returns false when missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("x", "<!DOCTYPE html><html><body>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const input = "```html\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\n<div/>\n```")).toBe("<div/>");
  });

  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<div>ok</div>")).toBe("<div>ok</div>");
  });

  it("handles null/undefined gracefully", () => {
    // @ts-expect-error intentional
    expect(cleanGeneratedHtml(null)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-replace edit", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("hello earth");
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

  it("skips edits where the find string is absent", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const { code } = applyEdits("a a a", [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
  });

  it("ignores malformed edit entries", () => {
    // @ts-expect-error intentional
    const { code, applied } = applyEdits("hello", [null, { find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns 0 applied for empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
