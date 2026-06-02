import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

function beat(code: string, isNew = true): CodeBeat {
  return { label: "L", lang: "html", code, say: "s", isNew };
}

// ── assembleBeats ─────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("does not add delimiters between chunks", () => {
    expect(assembleBeats([beat("foo"), beat("bar")])).toBe("foobar");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("includes only beats 0..index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const VALID = [
    beat('<!DOCTYPE html>\n<html><head></head><body>hello</body></html>'),
  ];

  it("returns true for a minimal valid HTML document", () => {
    expect(beatsFormValidDoc(VALID)).toBe(true);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html>\n<html><body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html>\n<html></html>")])).toBe(false);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html fence", () => {
    expect(cleanGeneratedHtml("```html\n<div></div>\n```")).toBe("<div></div>");
  });

  it("strips plain ``` fence", () => {
    expect(cleanGeneratedHtml("```\n<div></div>\n```")).toBe("<div></div>");
  });

  it("leaves clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div></div>")).toBe("<div></div>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  \n<div></div>\n  ")).toBe("<div></div>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("<html>OLD</html>", [
      { find: "OLD", replace: "NEW" },
    ]);
    expect(code).toBe("<html>NEW</html>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("<a><b>", [
      { find: "<a>", replace: "<x>" },
      { find: "<b>", replace: "<y>" },
    ]);
    expect(code).toBe("<x><y>");
    expect(applied).toBe(2);
  });

  it("skips an edit when find is not found", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "MISSING", replace: "world" },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "world" },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies the first occurrence only", () => {
    const { code } = applyEdits("aXaXa", [{ find: "X", replace: "O" }]);
    // First X replaced, second left
    expect(code).toBe("aOaXa");
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits("original", []);
    expect(code).toBe("original");
    expect(applied).toBe(0);
  });

  it("returns applied count of 0 when all finds miss", () => {
    const { applied } = applyEdits("abc", [
      { find: "x", replace: "1" },
      { find: "y", replace: "2" },
    ]);
    expect(applied).toBe(0);
  });
});
