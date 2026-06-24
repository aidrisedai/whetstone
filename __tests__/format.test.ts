import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "test narration",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates all beats in order", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns beats up to and including the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>\n<html><head><title>T</title></head><body><p>hi</p></body></html>`;

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for an empty array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for a fragment without DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<div>hello</div>")])).toBe(false);
  });

  it("returns false when missing </html>", () => {
    const partial = `<!DOCTYPE html>\n<html><body>content`;
    expect(beatsFormValidDoc([beat(partial)])).toBe(false);
  });

  it("returns false when missing <body", () => {
    const noBody = `<!DOCTYPE html>\n<html><head></head></html>`;
    expect(beatsFormValidDoc([beat(noBody)])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing markdown code fences", () => {
    const fenced = "```html\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<div>hi</div>");
  });

  it("strips ``` without language", () => {
    const fenced = "```\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<div>hi</div>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<div>clean</div>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "<html><body><p>hello</p></body></html>";

  it("replaces first occurrence of find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "hello", replace: "world" }]);
    expect(code).toBe("<html><body><p>world</p></body></html>");
    expect(applied).toBe(1);
  });

  it("returns 0 applied when find string is not present", () => {
    const { code, applied } = applyEdits(base, [{ find: "missing", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "<p>", replace: "<p id='x'>" },
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("<html><body><p id='x'>world</p></body></html>");
    expect(applied).toBe(2);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const dup = "aa-aa";
    const { code, applied } = applyEdits(dup, [{ find: "aa", replace: "bb" }]);
    expect(code).toBe("bb-aa");
    expect(applied).toBe(1);
  });
});
