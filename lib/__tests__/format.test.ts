import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string): CodeBeat => ({ label: "test", lang: "html", code, say: "", isNew: false });

describe("assembleBeats", () => {
  it("joins beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
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

  it("handles index equal to array length - 1 (last element)", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("XY");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head>"),
    beat("<body><p>Hello</p></body></html>"),
  ];

  it("returns true for a valid HTML document spread across beats", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const noDt = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(noDt)).toBe(false);
  });

  it("returns false when closing html tag is missing", () => {
    const noClose = [beat("<!DOCTYPE html><html><body>")];
    expect(beatsFormValidDoc(noClose)).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    const noBody = [beat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(noBody)).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    const fenced = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<html></html>");
  });

  it("strips plain code fences without a language tag", () => {
    expect(cleanGeneratedHtml("```\n<html></html>\n```")).toBe("<html></html>");
  });

  it("leaves plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const code = "Hello world! Hello again!";

  it("replaces the first occurrence of find", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
    ]);
    expect(result).toBe("Hi world! Hello again!");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
      { find: "world", replace: "earth" },
    ]);
    expect(result).toBe("Hi earth! Hello again!");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when no edits match", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "nonexistent", replace: "x" },
    ]);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });

  it("skips malformed edits (empty find, wrong types)", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "", replace: "x" },
      { find: null as unknown as string, replace: "y" },
    ]);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code: result, applied } = applyEdits(code, []);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });
});
