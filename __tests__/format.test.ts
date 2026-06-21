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

// ── uid ───────────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("produces unique ids across calls", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it("uses the supplied prefix", () => {
    expect(uid("part")).toMatch(/^part_/);
    expect(uid("q")).toMatch(/^q_/);
  });

  it("defaults to 'm' prefix", () => {
    expect(uid()).toMatch(/^m_/);
  });
});

// ── assembleBeats ─────────────────────────────────────────────────────────────

function makeBeat(code: string): CodeBeat {
  return { label: "test", lang: "html", code, say: "", isNew: true };
}

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [makeBeat("<html>"), makeBeat("<body>"), makeBeat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("assembles beats 0..index inclusive", () => {
    const beats = [makeBeat("A"), makeBeat("B"), makeBeat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns only first beat for index 0", () => {
    const beats = [makeBeat("A"), makeBeat("B")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validDoc = [
    makeBeat("<!DOCTYPE html><html><head></head>"),
    makeBeat("<body>hello</body></html>"),
  ];

  it("returns true for a complete, valid HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    const beats = [makeBeat("<html><body>hi</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    const beats = [makeBeat("<!DOCTYPE html><html><body>hi</body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when <body is missing", () => {
    const beats = [makeBeat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips a triple-backtick html fence", () => {
    const input = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("strips a plain triple-backtick fence", () => {
    const input = "```\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("passes clean HTML through unchanged", () => {
    const html = "<!DOCTYPE html><html><body></body></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const base = "<html><body><p>Hello</p></body></html>";

  it("applies a single matching edit", () => {
    const { code, applied } = applyEdits(base, [{ find: "<p>Hello</p>", replace: "<p>World</p>" }]);
    expect(code).toBe("<html><body><p>World</p></body></html>");
    expect(applied).toBe(1);
  });

  it("applies only the FIRST occurrence of a match", () => {
    const src = "aaa";
    const { code, applied } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not present", () => {
    const { code, applied } = applyEdits(base, [{ find: "MISSING", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("applies multiple valid edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "World" },
      { find: "</body>", replace: "<footer/></body>" },
    ]);
    expect(code).toContain("World");
    expect(code).toContain("<footer/>");
    expect(applied).toBe(2);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
