import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

function makeBeat(code: string): CodeBeat {
  return { label: "beat", lang: "html", code, say: "", isNew: false };
}

// ── assembleBeats ─────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("concatenates beats in order", () => {
    const beats = ["<html>", "<body>", "</body></html>"].map(makeBeat);
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    const beats = ["a", "b", "c"].map(makeBeat);
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("handles index 0 (first beat only)", () => {
    const beats = ["a", "b"].map(makeBeat);
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body>hello</body></html>`;

  it("returns true for a minimal valid HTML document", () => {
    expect(beatsFormValidDoc([makeBeat(validDoc)])).toBe(true);
  });

  it("returns false for an empty beat list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    expect(beatsFormValidDoc([makeBeat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips ```html ... ``` fences", () => {
    const input = "```html\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("strips plain ``` fences", () => {
    const input = "```\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("passes through clean HTML unchanged", () => {
    const input = "<div>hi</div>";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("returns original code and applied=0 when no edits match", () => {
    const result = applyEdits("<div>hi</div>", [{ find: "xxx", replace: "yyy" }]);
    expect(result.applied).toBe(0);
    expect(result.code).toBe("<div>hi</div>");
  });

  it("applies a single matching edit", () => {
    const result = applyEdits("<div>hello</div>", [{ find: "hello", replace: "world" }]);
    expect(result.applied).toBe(1);
    expect(result.code).toBe("<div>world</div>");
  });

  it("applies multiple edits in order", () => {
    const code = "<a><b></b></a>";
    const result = applyEdits(code, [
      { find: "<a>", replace: "<section>" },
      { find: "</a>", replace: "</section>" },
    ]);
    expect(result.applied).toBe(2);
    expect(result.code).toBe("<section><b></b></section>");
  });

  it("replaces only the first occurrence", () => {
    const result = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(result.applied).toBe(1);
    expect(result.code).toBe("baa");
  });

  it("skips edits with empty find string", () => {
    const result = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(result.applied).toBe(0);
    expect(result.code).toBe("hello");
  });

  it("returns applied=0 for an empty edits array", () => {
    const result = applyEdits("hello", []);
    expect(result.applied).toBe(0);
    expect(result.code).toBe("hello");
  });
});
