import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "./format";
import type { CodeBeat } from "./types";

function beat(code: string, lang: CodeBeat["lang"] = "html"): CodeBeat {
  return { label: "L", lang, code, say: "", isNew: false };
}

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    expect(assembleBeats([beat("<html>"), beat("</html>")])).toBe("<html></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("includes only the first beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("A"), beat("B")], 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head><body>hello</body></html>"),
  ];

  it("returns true for a valid self-contained HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
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
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("a b c", [
      { find: "a", replace: "X" },
      { find: "b", replace: "Y" },
    ]);
    expect(code).toBe("X Y c");
    expect(applied).toBe(2);
  });

  it("only replaces the first occurrence", () => {
    const { code, applied } = applyEdits("cat cat cat", [{ find: "cat", replace: "dog" }]);
    expect(code).toBe("dog cat cat");
    expect(applied).toBe(1);
  });

  it("counts only edits that matched", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "abc", replace: "xyz" },
      { find: "nope", replace: "never" },
    ]);
    expect(code).toBe("xyz");
    expect(applied).toBe(1);
  });

  it("skips invalid edits gracefully", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "", replace: "X" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const html = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(html)).toBe("<html></html>");
  });

  it("strips bare code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});
