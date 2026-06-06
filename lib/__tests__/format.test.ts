import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
  uid,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "say",
  isNew: true,
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

  it("assembles up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    "<!DOCTYPE html><html><head></head><body>hello</body></html>";

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false if missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body>hi</body></html>")])).toBe(false);
  });

  it("returns false if missing closing html tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>hi</body>")])).toBe(false);
  });

  it("returns false if missing body tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    expect(cleanGeneratedHtml("```html\n<div/>\n```")).toBe("<div/>");
    expect(cleanGeneratedHtml("```\n<div/>\n```")).toBe("<div/>");
  });

  it("trims whitespace", () => {
    expect(cleanGeneratedHtml("  <div/>  ")).toBe("<div/>");
  });

  it("returns plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div/>")).toBe("<div/>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "function hello() { return 'world'; }";

  it("applies a single find-and-replace edit", () => {
    const { code, applied } = applyEdits(base, [
      { find: "'world'", replace: "'earth'" },
    ]);
    expect(code).toBe("function hello() { return 'earth'; }");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "hello", replace: "greet" },
      { find: "'world'", replace: "'you'" },
    ]);
    expect(code).toBe("function greet() { return 'you'; }");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits(base, [
      { find: "notHere", replace: "x" },
    ]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("returns 0 applied for empty edits list", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const src = "aaa";
    const { code } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });
});

describe("uid", () => {
  it("returns a string with the given prefix", () => {
    const id = uid("msg");
    expect(id.startsWith("msg_")).toBe(true);
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid("t")));
    expect(ids.size).toBe(50);
  });

  it("defaults to 'm' prefix", () => {
    expect(uid().startsWith("m_")).toBe(true);
  });
});
