import { describe, it, expect } from "vitest";
import {
  cleanGeneratedHtml,
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew: false,
});

describe("cleanGeneratedHtml", () => {
  it("strips leading html code fence", () => {
    expect(cleanGeneratedHtml("```html\n<div></div>\n```")).toBe("<div></div>");
  });

  it("strips generic code fence", () => {
    expect(cleanGeneratedHtml("```\n<div></div>\n```")).toBe("<div></div>");
  });

  it("returns plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div>hello</div>")).toBe("<div>hello</div>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <html></html>  ")).toBe("<html></html>");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("aaa bbb ccc", [
      { find: "aaa", replace: "AAA" },
      { find: "bbb", replace: "BBB" },
    ]);
    expect(code).toBe("AAA BBB ccc");
    expect(applied).toBe(2);
  });

  it("only replaces the first occurrence", () => {
    const { code, applied } = applyEdits("foo foo foo", [{ find: "foo", replace: "bar" }]);
    expect(code).toBe("bar foo foo");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found and reports applied count", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "xyz", replace: "abc" },
      { find: "hello", replace: "bye" },
    ]);
    expect(code).toBe("bye");
    expect(applied).toBe(1);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns 0 applied for empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips null/malformed edit entries", () => {
    const { code, applied } = applyEdits("hello", [
      null as unknown as { find: string; replace: string },
      { find: "hello", replace: "hi" },
    ]);
    expect(code).toBe("hi");
    expect(applied).toBe(1);
  });
});

describe("assembleBeats", () => {
  it("concatenates code from all beats in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("concatenates only up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns first beat for index 0", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("X");
  });

  it("returns all beats when index >= length-1", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html><head></head><body><p>Hi</p></body></html>`;

  it("returns true for a valid, complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("works with splits across multiple beats", () => {
    const beats = [
      beat("<!DOCTYPE html><html><head></head>"),
      beat("<body><p>Hello</p>"),
      beat("</body></html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });
});
