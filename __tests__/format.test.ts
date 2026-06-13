import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "...",
  isNew,
});

describe("uid", () => {
  it("generates unique IDs with a prefix", () => {
    const a = uid("msg");
    const b = uid("msg");
    expect(a).toMatch(/^msg_/);
    expect(a).not.toBe(b);
  });

  it("uses default prefix 'm'", () => {
    expect(uid()).toMatch(/^m_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [beat("AAA"), beat("BBB"), beat("CCC")];
    expect(assembleBeats(beats)).toBe("AAABBBCCC");
  });

  it("returns empty string for empty array", () => {
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
  const validDoc = [
    beat("<!DOCTYPE html><html lang='en'><head></head>"),
    beat("<body>hello</body></html>"),
  ];

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when missing <!DOCTYPE html>", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when missing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when missing <body>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("applyEdits", () => {
  const code = "<html><body><p>Hello world</p></body></html>";

  it("applies a single exact-match edit", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello world", replace: "Goodbye world" },
    ]);
    expect(result).toBe("<html><body><p>Goodbye world</p></body></html>");
    expect(applied).toBe(1);
  });

  it("applies only the first occurrence for each edit", () => {
    const multi = "aXbXcX";
    const { code: result, applied } = applyEdits(multi, [{ find: "X", replace: "Y" }]);
    expect(result).toBe("aYbXcX");
    expect(applied).toBe(1);
  });

  it("skips edits where find string is not found", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "NOT_FOUND", replace: "anything" },
    ]);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in sequence", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hey" },
      { find: "world", replace: "there" },
    ]);
    expect(result).toContain("Hey");
    expect(result).toContain("there");
    expect(applied).toBe(2);
  });

  it("skips edits with empty find string", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "", replace: "injected" },
    ]);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });

  it("returns applied=0 when all edits miss", () => {
    const { applied } = applyEdits(code, [
      { find: "NOPE1", replace: "x" },
      { find: "NOPE2", replace: "y" },
    ]);
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips a markdown html code fence", () => {
    const fenced = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("strips a plain code fence", () => {
    const fenced = "```\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<html></html>");
  });

  it("leaves clean HTML unchanged", () => {
    const html = "<!DOCTYPE html><html><body></body></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles empty / null-ish input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml("   ")).toBe("");
  });
});
