import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew: true,
});

describe("assembleBeats", () => {
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("returns all beats up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const valid = [
    beat("<!DOCTYPE html><html><head></head><body>Hello</body></html>"),
  ];
  const missingDoctype = [beat("<html><body>Hi</body></html>")];
  const missingClose = [beat("<!DOCTYPE html><html><body>Hi</body>")];
  const missingBody = [beat("<!DOCTYPE html><html></html>")];

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc(valid)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc(missingDoctype)).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc(missingClose)).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc(missingBody)).toBe(false);
  });

  it("returns false for empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ```html...``` fences", () => {
    const input = "```html\n<p>Hello</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>Hello</p>");
  });

  it("strips plain ``` fences", () => {
    const input = "```\n<p>Hi</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>Hi</p>");
  });

  it("passes through plain HTML unchanged", () => {
    const input = "<p>Hello</p>";
    expect(cleanGeneratedHtml(input)).toBe("<p>Hello</p>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const code = `<div id="app">Hello World</div>`;

  it("applies a simple find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello World", replace: "Goodbye World" },
    ]);
    expect(out).toBe(`<div id="app">Goodbye World</div>`);
    expect(applied).toBe(1);
  });

  it("returns applied=0 when the find string is not present", () => {
    const { applied } = applyEdits(code, [{ find: "NotPresent", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("applies edits in order, each on the first match", () => {
    const base = "aaa";
    const { code: out, applied } = applyEdits(base, [{ find: "a", replace: "b" }]);
    expect(out).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits with empty find strings", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("chains multiple edits", () => {
    const { code: out, applied } = applyEdits("foo bar baz", [
      { find: "foo", replace: "one" },
      { find: "bar", replace: "two" },
    ]);
    expect(out).toBe("one two baz");
    expect(applied).toBe(2);
  });

  it("skips null/malformed edit entries", () => {
    const { applied } = applyEdits(code, [null as unknown as { find: string; replace: string }]);
    expect(applied).toBe(0);
  });
});
