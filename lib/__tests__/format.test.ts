import { describe, expect, it } from "vitest";
import { applyEdits, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml } from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "test",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("abc"), beat("def"), beat("ghi")];
    expect(assembleBeats(beats)).toBe("abcdefghi");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns beats up to and including index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns all beats when index is last", () => {
    const beats = [beat("a"), beat("b")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("applyEdits", () => {
  const base = "<html><body><p>Hello</p></body></html>";

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "World" }]);
    expect(code).toBe("<html><body><p>World</p></body></html>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "<body>", replace: "<body class=\"main\">" },
      { find: "Hello", replace: "World" },
    ]);
    expect(code).toContain('class="main"');
    expect(code).toContain("World");
    expect(applied).toBe(2);
  });

  it("reports 0 applied when find target is missing", () => {
    const { code, applied } = applyEdits(base, [{ find: "missing", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces first occurrence", () => {
    const code = "aaaa";
    const { code: result, applied } = applyEdits(code, [{ find: "aa", replace: "bb" }]);
    expect(result).toBe("bbaa");
    expect(applied).toBe(1);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading markdown code fence", () => {
    const raw = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("passes through clean HTML unchanged", () => {
    const raw = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(raw)).toBe(raw);
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("strips generic code fence without language tag", () => {
    const raw = "```\n<div></div>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<div></div>");
  });
});
