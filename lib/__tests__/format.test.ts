import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: "html" | "css" | "js" = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "narration",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns beats 0 through index (inclusive)", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
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

  it("is case-insensitive for DOCTYPE", () => {
    const doc = `<!doctype html><html><head></head><body></body></html>`;
    expect(beatsFormValidDoc([beat(doc)])).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    const fenced = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<html></html>");
  });

  it("strips bare code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const baseCode = "<html><body><h1>Hello</h1></body></html>";

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(baseCode, [{ find: "Hello", replace: "World" }]);
    expect(code).toBe("<html><body><h1>World</h1></body></html>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(baseCode, [
      { find: "Hello", replace: "World" },
      { find: "<h1>", replace: "<h2>" },
    ]);
    expect(code).toContain("World");
    expect(code).toContain("<h2>");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("returns 0 applied when find is not found", () => {
    const { code, applied } = applyEdits(baseCode, [{ find: "NOTFOUND", replace: "x" }]);
    expect(code).toBe(baseCode);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(baseCode, [{ find: "", replace: "x" }]);
    expect(code).toBe(baseCode);
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits(baseCode, []);
    expect(code).toBe(baseCode);
    expect(applied).toBe(0);
  });

  it("skips null/malformed edit entries", () => {
    const { applied } = applyEdits(baseCode, [null as never, undefined as never]);
    expect(applied).toBe(0);
  });
});
