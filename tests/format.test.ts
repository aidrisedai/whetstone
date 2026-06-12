import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string): CodeBeat => ({ code, label: "l", explanation: "e" });

describe("assembleBeats", () => {
  it("joins all beat code in order", () => {
    expect(assembleBeats([beat("<a>"), beat("<b>"), beat("<c>")])).toBe("<a><b><c>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("assembles up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("includes all beats when index is last", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when missing doctype", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when missing closing html tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when missing body tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips surrounding markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("strips plain code fences without language", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("returns plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const code = `<div id="main">Hello World</div>`;

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello World", replace: "Hi There" },
    ]);
    expect(out).toBe(`<div id="main">Hi There</div>`);
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello", replace: "Goodbye" },
      { find: "World", replace: "Earth" },
    ]);
    expect(out).toBe(`<div id="main">Goodbye Earth</div>`);
    expect(applied).toBe(2);
  });

  it("returns 0 applied when find string not present", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "nonexistent", replace: "x" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("applies to first occurrence only", () => {
    const dupe = "aaa";
    const { code: out, applied } = applyEdits(dupe, [{ find: "a", replace: "b" }]);
    expect(out).toBe("baa");
    expect(applied).toBe(1);
  });
});
