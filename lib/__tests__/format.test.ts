import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string): CodeBeat => ({
  code,
  label: "",
  lang: "html",
  say: "",
  isNew: false,
});

describe("assembleBeats", () => {
  it("concatenates code segments in order", () => {
    expect(assembleBeats([beat("<html>"), beat("<body>"), beat("</body></html>")])).toBe(
      "<html><body></body></html>",
    );
  });

  it("returns an empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("returns the single beat unchanged", () => {
    expect(assembleBeats([beat("abc")])).toBe("abc");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("returns just the first beat at index 0", () =>
    expect(assembleBeatsUpTo(beats, 0)).toBe("A"));
  it("includes beats 0 through 1 at index 1", () =>
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB"));
  it("includes all beats at the last index", () =>
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC"));
});

describe("beatsFormValidDoc", () => {
  const validHtml = '<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>';

  it("returns true for a complete HTML document", () =>
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true));

  it("returns false for an empty array", () =>
    expect(beatsFormValidDoc([])).toBe(false));

  it("returns false when DOCTYPE is missing", () =>
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false));

  it("returns false when closing </html> is missing", () =>
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false));

  it("returns false when <body> is missing", () =>
    expect(
      beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")]),
    ).toBe(false));

  it("is case-insensitive for DOCTYPE", () =>
    expect(
      beatsFormValidDoc([beat("<!doctype html><html><body></body></html>")]),
    ).toBe(true));
});

describe("cleanGeneratedHtml", () => {
  it("strips triple-backtick html fences", () =>
    expect(cleanGeneratedHtml("```html\n<html></html>\n```")).toBe(
      "<html></html>",
    ));

  it("strips generic triple-backtick fences", () =>
    expect(cleanGeneratedHtml("```\n<html></html>\n```")).toBe(
      "<html></html>",
    ));

  it("leaves already-clean HTML untouched", () =>
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>"));

  it("handles null gracefully", () =>
    expect(cleanGeneratedHtml(null as unknown as string)).toBe(""));

  it("trims surrounding whitespace", () =>
    expect(cleanGeneratedHtml("  <html></html>  ")).toBe("<html></html>"));
});

describe("applyEdits", () => {
  it("replaces the first occurrence of a string", () => {
    const { code, applied } = applyEdits("<div>old</div>", [
      { find: "old", replace: "new" },
    ]);
    expect(code).toBe("<div>new</div>");
    expect(applied).toBe(1);
  });

  it("only replaces the first occurrence (not all)", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("returns applied=0 when the find string is not found", () => {
    const { code, applied } = applyEdits("<div>text</div>", [
      { find: "missing", replace: "x" },
    ]);
    expect(code).toBe("<div>text</div>");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("foo bar baz", [
      { find: "foo", replace: "FOO" },
      { find: "bar", replace: "BAR" },
    ]);
    expect(code).toBe("FOO BAR baz");
    expect(applied).toBe(2);
  });

  it("skips edits with an empty find string", () => {
    const { applied } = applyEdits("text", [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("skips null/undefined edit entries", () => {
    const { code, applied } = applyEdits("hello", [
      null as never,
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("world");
    expect(applied).toBe(1);
  });

  it("returns the original code when no edits are provided", () => {
    const { code, applied } = applyEdits("original", []);
    expect(code).toBe("original");
    expect(applied).toBe(0);
  });
});
