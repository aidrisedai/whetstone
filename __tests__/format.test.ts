import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "chunk",
  lang: "html",
  code,
  say: "explanation",
  isNew,
});

describe("uid", () => {
  it("generates unique ids", () => {
    const a = uid("x");
    const b = uid("x");
    expect(a).not.toBe(b);
  });

  it("uses the given prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });
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
  const beats = [beat("A"), beat("B"), beat("C")];

  it("includes only beats up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("includes all beats when index is last", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("includes only the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat("<!DOCTYPE html><html><head></head><body>"),
    beat("<p>hello</p>"),
    beat("</body></html>"),
  ];

  it("returns true for a well-formed HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when no DOCTYPE", () => {
    const beats = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when no closing html tag", () => {
    const beats = [beat("<!DOCTYPE html><html><body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips triple-backtick fences with language tag", () => {
    const input = "```html\n<h1>Hello</h1>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<h1>Hello</h1>");
  });

  it("strips plain triple-backtick fences", () => {
    const input = "```\n<h1>Hello</h1>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<h1>Hello</h1>");
  });

  it("passes through clean HTML unchanged", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const code = "<h1>Hello World</h1><p>Some text here</p>";

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello World", replace: "Goodbye" },
    ]);
    expect(out).toBe("<h1>Goodbye</h1><p>Some text here</p>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello World", replace: "Hi" },
      { find: "Some text here", replace: "New content" },
    ]);
    expect(out).toBe("<h1>Hi</h1><p>New content</p>");
    expect(applied).toBe(2);
  });

  it("skips edits where find string is not found", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "notfound", replace: "X" },
    ]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "", replace: "X" },
    ]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const repeated = "<p>hi</p><p>hi</p>";
    const { code: out, applied } = applyEdits(repeated, [
      { find: "<p>hi</p>", replace: "<p>bye</p>" },
    ]);
    expect(out).toBe("<p>bye</p><p>hi</p>");
    expect(applied).toBe(1);
  });

  it("handles invalid edit objects gracefully", () => {
    const { code: out, applied } = applyEdits(code, [
      null as unknown as { find: string; replace: string },
      { find: "Hello World", replace: "Hi" },
    ]);
    expect(out).toBe("<h1>Hi</h1><p>Some text here</p>");
    expect(applied).toBe(1);
  });
});
