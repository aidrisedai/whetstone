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

const beat = (code: string, lang: "html" | "css" | "js" = "html"): CodeBeat => ({
  code,
  lang,
  label: "test beat",
  say: "narration",
  isNew: false,
});

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(uid()).toBeTruthy();
  });

  it("returns unique values on consecutive calls", () => {
    expect(uid()).not.toBe(uid());
  });

  it("uses custom prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
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

  it("includes beats 0 through index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("returns all beats at last index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body>hello</body></html>`;

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html fence", () => {
    expect(cleanGeneratedHtml("```html\n<div/>\n```")).toBe("<div/>");
  });

  it("strips plain ``` fence", () => {
    expect(cleanGeneratedHtml("```\n<div/>\n```")).toBe("<div/>");
  });

  it("leaves plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<div/>")).toBe("<div/>");
  });

  it("handles null/undefined safely", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <div/>  ")).toBe("<div/>");
  });
});

describe("applyEdits", () => {
  const code = `function greet() {\n  return "hello";\n}`;

  it("applies a simple find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [{ find: '"hello"', replace: '"world"' }]);
    expect(out).toContain('"world"');
    expect(applied).toBe(1);
  });

  it("only replaces the FIRST occurrence", () => {
    const { code: out } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(out).toBe("baa");
  });

  it("returns applied=0 when find string is not present", () => {
    const { applied } = applyEdits(code, [{ find: "notfound", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits("abc", [
      { find: "a", replace: "x" },
      { find: "b", replace: "y" },
    ]);
    expect(out).toBe("xyc");
    expect(applied).toBe(2);
  });

  it("skips edits with empty find strings", () => {
    const { code: out, applied } = applyEdits("abc", [{ find: "", replace: "x" }]);
    expect(out).toBe("abc");
    expect(applied).toBe(0);
  });

  it("handles null/undefined edits in the array gracefully", () => {
    const edits = [null, { find: "a", replace: "z" }] as unknown as { find: string; replace: string }[];
    const { code: out } = applyEdits("abc", edits);
    expect(out).toBe("zbc");
  });
});
