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

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "label",
  lang: "html",
  code,
  say: "say",
  isNew,
});

describe("uid", () => {
  it("generates unique ids with a prefix", () => {
    const a = uid("m");
    const b = uid("m");
    expect(a).not.toBe(b);
    expect(a.startsWith("m_")).toBe(true);
  });

  it("uses 'm' prefix by default", () => {
    expect(uid()).toMatch(/^m_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat("<!DOCTYPE html><html lang='en'><head></head>"),
    beat("<body>content</body></html>"),
  ];

  it("returns true for valid HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when missing doctype", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when missing closing html tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    const input = "```html\n<!DOCTYPE html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html>");
  });

  it("strips plain code fences without language", () => {
    const input = "```\n<html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html>");
  });

  it("leaves bare HTML untouched", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const base = `<html><body><p id="msg">Hello</p></body></html>`;

  it("applies a matching edit", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "World" }]);
    expect(code).toContain("World");
    expect(applied).toBe(1);
  });

  it("skips edits where find string is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "nothere", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "World" },
      { find: "<body>", replace: "<body class='x'>" },
    ]);
    expect(code).toContain("World");
    expect(code).toContain("class='x'");
    expect(applied).toBe(2);
  });

  it("only replaces first occurrence", () => {
    const src = "a a a";
    const { code } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
  });

  it("skips invalid edits (empty find)", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
