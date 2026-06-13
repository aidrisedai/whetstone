import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "",
  isNew: true,
});

describe("uid", () => {
  it("generates unique ids with the given prefix", () => {
    const a = uid("x");
    const b = uid("x");
    expect(a).toMatch(/^x_/);
    expect(a).not.toBe(b);
  });
  it("defaults to 'm' prefix", () => {
    expect(uid()).toMatch(/^m_/);
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
  it("includes beats 0..index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });
  it("returns false if DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("returns false if </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("returns false if <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ``` fences", () => {
    const raw = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<!DOCTYPE html>\n<html></html>");
  });
  it("strips plain ``` fences too", () => {
    const raw = "```\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<!DOCTYPE html>\n<html></html>");
  });
  it("leaves unfenced HTML untouched", () => {
    const raw = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(raw)).toBe(raw);
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const code = `<div id="app">\n  <h1>Hello</h1>\n</div>`;

  it("applies a single exact find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "<h1>Hello</h1>", replace: "<h1>World</h1>" },
    ]);
    expect(out).toContain("<h1>World</h1>");
    expect(applied).toBe(1);
  });

  it("applies the first occurrence only", () => {
    const repeated = "ab ab ab";
    const { code: out, applied } = applyEdits(repeated, [{ find: "ab", replace: "XY" }]);
    expect(out).toBe("XY ab ab");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "nothere", replace: "X" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("applies multiple edits sequentially", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello", replace: "World" },
      { find: "div", replace: "section" },
    ]);
    expect(out).toContain("World");
    expect(out).toContain("<section");
    expect(applied).toBe(2);
  });

  it("skips edits with empty find string", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "", replace: "X" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("returns unchanged code for empty edits list", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
});
