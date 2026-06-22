import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
  uid,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "Test",
  lang,
  code,
  say: "say",
  isNew: true,
});

describe("uid", () => {
  it("generates unique ids", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it("uses the given prefix", () => {
    expect(uid("part").startsWith("part_")).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns the full file when index is last", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns just the first beat at index 0", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat("<!DOCTYPE html><html><head></head><body>hello</body></html>"),
  ];

  it("returns true for a valid full HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when beats array is empty", () => {
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

  it("handles case-insensitive DOCTYPE", () => {
    expect(
      beatsFormValidDoc([beat("<!doctype html><html><body>x</body></html>")])
    ).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing markdown fences", () => {
    const input = "```html\n<h1>Hello</h1>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<h1>Hello</h1>");
  });

  it("strips generic fences with no language tag", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("returns plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  const base = "const foo = 1;\nconst bar = 2;\n";

  it("applies a single find-replace correctly", () => {
    const { code, applied } = applyEdits(base, [{ find: "foo = 1", replace: "foo = 99" }]);
    expect(code).toContain("foo = 99");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "foo = 1", replace: "foo = 99" },
      { find: "bar = 2", replace: "bar = 88" },
    ]);
    expect(code).toContain("foo = 99");
    expect(code).toContain("bar = 88");
    expect(applied).toBe(2);
  });

  it("skips edits where find string is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "not_here", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("returns applied=0 when no edits succeed (signal to rebuild)", () => {
    const { applied } = applyEdits(base, [
      { find: "missing1", replace: "a" },
      { find: "missing2", replace: "b" },
    ]);
    expect(applied).toBe(0);
  });

  it("skips malformed edit entries", () => {
    const { code, applied } = applyEdits(base, [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
      { find: "foo = 1", replace: "foo = 5" },
    ]);
    expect(applied).toBe(1);
    expect(code).toContain("foo = 5");
  });

  it("only replaces the first occurrence", () => {
    const src = "a a a";
    const { code, applied } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
    expect(applied).toBe(1);
  });
});
