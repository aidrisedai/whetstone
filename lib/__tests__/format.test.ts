import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "chunk",
  lang,
  code,
  say: "narration",
  isNew: true,
});

describe("uid", () => {
  it("generates unique ids", () => {
    const a = uid("x");
    const b = uid("x");
    expect(a).not.toBe(b);
  });

  it("includes the prefix", () => {
    expect(uid("test")).toMatch(/^test_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("A"), beat("B"), beat("C")])).toBe("ABC");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index (inclusive)", () => {
    expect(assembleBeatsUpTo([beat("A"), beat("B"), beat("C")], 1)).toBe("AB");
  });

  it("with index 0 returns only first beat", () => {
    expect(assembleBeatsUpTo([beat("A"), beat("B")], 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body></body></html>`;

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown html fences", () => {
    const fenced = "```html\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<div>hi</div>");
  });

  it("strips plain code fences", () => {
    const fenced = "```\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<div>hi</div>");
  });

  it("passes through plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div>hi</div>")).toBe("<div>hi</div>");
  });

  it("trims whitespace", () => {
    expect(cleanGeneratedHtml("  <div>hi</div>  ")).toBe("<div>hi</div>");
  });
});

describe("applyEdits", () => {
  const base = `<body>Hello World</body>`;

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("<body>Hi World</body>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(code).toBe("<body>Hi Earth</body>");
    expect(applied).toBe(2);
  });

  it("skips edits that don't match", () => {
    const { code, applied } = applyEdits(base, [{ find: "Goodbye", replace: "Hi" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("skips edits with empty find", () => {
    const { applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("returns original code + 0 applied for empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
