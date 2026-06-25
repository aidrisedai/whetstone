import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, label = "Part"): CodeBeat => ({
  label,
  code,
  lang: "html",
  say: "",
  isNew: false,
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<body>"), beat("</body>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><body></body>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head>"),
    beat("<body>hello</body></html>"),
  ];

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false if no DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false if no closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const input = "```html\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hello</p>");
  });

  it("strips bare code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>x</p>\n```")).toBe("<p>x</p>");
  });

  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hello</p>")).toBe("<p>hello</p>");
  });

  it("handles empty or whitespace-only input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml("   ")).toBe("");
  });

  it("handles null-ish values defensively", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "Hello, world! Hello again.";

  it("replaces the first occurrence of find", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("Hi, world! Hello again.");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("Hi, earth! Hello again.");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when find string not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "MISSING", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips invalid edits (empty find, missing keys)", () => {
    const { code, applied } = applyEdits(base, [
      { find: "", replace: "X" },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(applied).toBe(1);
    expect(code).toBe("Hi, world! Hello again.");
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
