import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "label",
  lang: "html",
  code,
  say: "say",
  isNew,
});

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
  it("assembles only up to given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
});

describe("beatsFormValidDoc", () => {
  it("returns true for a valid HTML document across beats", () => {
    const beats = [beat("<!DOCTYPE html><html><head></head><body>"), beat("</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });
  it("returns false when missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("returns false when missing closing html tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips triple-backtick fences", () => {
    expect(cleanGeneratedHtml("```html\n<h1>hi</h1>\n```")).toBe("<h1>hi</h1>");
  });
  it("strips bare backtick fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("passes through unfenced html", () => {
    expect(cleanGeneratedHtml("<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });
});

describe("applyEdits", () => {
  const code = `<html><body><p id="msg">Hello</p></body></html>`;

  it("applies a single edit", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello", replace: "World" },
    ]);
    expect(out).toBe(`<html><body><p id="msg">World</p></body></html>`);
    expect(applied).toBe(1);
  });
  it("applies edits in order", () => {
    const { code: out, applied } = applyEdits("AAA", [
      { find: "A", replace: "B" },
      { find: "A", replace: "C" },
    ]);
    // First edit replaces first A → BAA, then second edit replaces first A → BCA
    expect(out).toBe("BCA");
    expect(applied).toBe(2);
  });
  it("skips edits where find is not found", () => {
    const { applied } = applyEdits(code, [{ find: "NOTFOUND", replace: "x" }]);
    expect(applied).toBe(0);
  });
  it("skips edits with empty find string", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
  it("returns original code when no edits", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
});
