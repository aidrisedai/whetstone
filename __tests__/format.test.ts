import { describe, it, expect } from "vitest";
import {
  cleanGeneratedHtml,
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("returns plain HTML unchanged", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("strips ```html ... ``` fences", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml("```html\n" + html + "\n```")).toBe(html);
  });

  it("strips ``` ... ``` fences (no language tag)", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml("```\n" + html + "\n```")).toBe(html);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    expect(cleanGeneratedHtml("  <div>hello</div>  ")).toBe("<div>hello</div>");
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single edit", () => {
    const result = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(result.code).toBe("hello earth");
    expect(result.applied).toBe(1);
  });

  it("applies multiple edits sequentially", () => {
    const result = applyEdits("aaa bbb ccc", [
      { find: "aaa", replace: "AAA" },
      { find: "ccc", replace: "CCC" },
    ]);
    expect(result.code).toBe("AAA bbb CCC");
    expect(result.applied).toBe(2);
  });

  it("counts only successfully applied edits", () => {
    const result = applyEdits("hello world", [
      { find: "world", replace: "earth" },
      { find: "notfound", replace: "x" },
    ]);
    expect(result.applied).toBe(1);
  });

  it("returns applied=0 when no edits match", () => {
    const result = applyEdits("hello world", [{ find: "xyz", replace: "abc" }]);
    expect(result.code).toBe("hello world");
    expect(result.applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const result = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(result.code).toBe("hello");
    expect(result.applied).toBe(0);
  });

  it("skips null/undefined edits gracefully", () => {
    const result = applyEdits("hello", [null as unknown as { find: string; replace: string }]);
    expect(result.code).toBe("hello");
    expect(result.applied).toBe(0);
  });

  it("replaces only the first match (not all occurrences)", () => {
    const result = applyEdits("a a a", [{ find: "a", replace: "b" }]);
    expect(result.code).toBe("b a a");
  });
});

// ── assembleBeats / assembleBeatsUpTo ─────────────────────────────────────────

function beat(code: string): CodeBeat {
  return { label: "l", lang: "html", code, say: "s", isNew: true };
}

describe("assembleBeats", () => {
  it("concatenates all beats", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("assembles from the start up to and including the index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

const VALID_HTML = `<!DOCTYPE html>
<html>
  <head><title>Test</title></head>
  <body><p>Hello</p></body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("returns true for a well-formed single-file HTML document", () => {
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const html = "<html><body></body></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    const html = "<!DOCTYPE html><html><body><p>hi</p></body>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("reassembles correctly when split across multiple beats", () => {
    const [first, ...rest] = VALID_HTML.split("\n");
    const allBeats = [beat(first + "\n"), ...rest.map((line) => beat(line + "\n"))];
    expect(beatsFormValidDoc(allBeats)).toBe(true);
  });
});
