import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "test",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles beats 0..index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html lang=\"en\">"),
    beat("<body><p>hi</p>"),
    beat("</body></html>"),
  ];

  it("accepts a valid complete HTML doc", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("rejects missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("rejects missing closing html tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("rejects missing body tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("applyEdits", () => {
  const base = `<html><body><h1>Hello</h1></body></html>`;

  it("applies a single edit", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "World" },
    ]);
    expect(code).toBe("<html><body><h1>World</h1></body></html>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "World" },
      { find: "<h1>", replace: "<h2>" },
    ]);
    expect(code).toContain("World");
    expect(code).toContain("<h2>");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not found", () => {
    const { code, applied } = applyEdits(base, [
      { find: "not-in-file", replace: "X" },
    ]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("applies only the first occurrence", () => {
    const input = "aaa";
    const { code } = applyEdits(input, [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const input = "```html\n<!DOCTYPE html><html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html><html></html>");
  });

  it("strips fences without language", () => {
    const input = "```\n<p>hi</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hi</p>");
  });

  it("passes through plain HTML unchanged", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
