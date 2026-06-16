import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

// ── helpers ────────────────────────────────────────────────────────────────

function beat(code: string): CodeBeat {
  return { label: "x", lang: "html", code, say: "", isNew: true };
}

// ── assembleBeats ──────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates all beat codes in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ──────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c"), beat("d")];
  it("includes beats 0..index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 3)).toBe("abcd");
  });
  it("returns first beat only for index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });
});

// ── beatsFormValidDoc ──────────────────────────────────────────────────────

const MINIMAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head><title>T</title></head>
<body><p>hi</p></body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("recognises a valid HTML doc spread across beats", () => {
    const beats = [
      beat("<!DOCTYPE html>\n<html lang=\"en\">\n<head><title>T</title></head>\n"),
      beat("<body><p>hi</p></body>\n</html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });
  it("rejects beats that lack the <!DOCTYPE> header", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("rejects beats whose concat doesn't end with </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><body>")])).toBe(false);
  });
  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("is case-insensitive for DOCTYPE and /html", () => {
    expect(beatsFormValidDoc([beat("<!doctype html><body></body></HTML>")])).toBe(true);
  });
  it("requires <body presence", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html></html>")])).toBe(false);
  });
});

// ── cleanGeneratedHtml ─────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ``` fences", () => {
    const fenced = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html>\n<html></html>");
  });
  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\nhello\n```")).toBe("hello");
  });
  it("leaves clean HTML untouched", () => {
    const clean = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(clean)).toBe(clean);
  });
  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  hello  ")).toBe("hello");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

// ── applyEdits ─────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const src = "<html><head></head><body><p>Hello</p></body></html>";

  it("replaces the first occurrence of a found substring", () => {
    const { code, applied } = applyEdits(src, [{ find: "<p>Hello</p>", replace: "<p>World</p>" }]);
    expect(code).toContain("<p>World</p>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(src, [
      { find: "<head></head>", replace: "<head><title>T</title></head>" },
      { find: "<p>Hello</p>", replace: "<p>Hi</p>" },
    ]);
    expect(code).toContain("<title>T</title>");
    expect(code).toContain("<p>Hi</p>");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present", () => {
    const { code, applied } = applyEdits(src, [{ find: "MISSING", replace: "x" }]);
    expect(code).toBe(src);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits(src, [{ find: "", replace: "x" }]);
    expect(code).toBe(src);
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits(src, []);
    expect(code).toBe(src);
    expect(applied).toBe(0);
  });

  it("only replaces the FIRST occurrence when text appears more than once", () => {
    const repeated = "<p>Hi</p><p>Hi</p>";
    const { code } = applyEdits(repeated, [{ find: "<p>Hi</p>", replace: "<p>Yo</p>" }]);
    expect(code).toBe("<p>Yo</p><p>Hi</p>");
  });
});
