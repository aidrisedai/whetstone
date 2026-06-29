import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew,
});

const VALID_DOC = "<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>";

describe("assembleBeats", () => {
  it("joins beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<html>"), beat("</html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><html></html>");
  });

  it("returns empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns only beats 0..index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(VALID_DOC)])).toBe(true);
  });

  it("returns false when the doctype is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when the closing </html> tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("passes through plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "function hello() { return 'hello'; }";

  it("applies a single edit at the first match", () => {
    const { code, applied } = applyEdits(base, [
      { find: "'hello'", replace: "'world'" },
    ]);
    expect(code).toBe("function hello() { return 'world'; }");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "hello", replace: "greet" },
      { find: "'hello'", replace: "'hi'" },
    ]);
    expect(code).toBe("function greet() { return 'hi'; }");
    expect(applied).toBe(2);
  });

  it("reports 0 applied when nothing matches", () => {
    const { code, applied } = applyEdits(base, [{ find: "NOPE", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("returns original code for an empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces the FIRST occurrence", () => {
    const src = "a a a";
    const { code, applied } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
    expect(applied).toBe(1);
  });
});
