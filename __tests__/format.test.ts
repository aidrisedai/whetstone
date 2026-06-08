import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew: true,
});

// ── assembleBeats ──────────────────────────────────────────────────────────
describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ──────────────────────────────────────────────────────
describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C"), beat("D")];

  it("returns all up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns only the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("returns all beats at the last index", () => {
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });
});

// ── beatsFormValidDoc ──────────────────────────────────────────────────────
describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>`;

  it("accepts a well-formed HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("rejects when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body>hi</body></html>")])).toBe(false);
  });

  it("rejects when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>hi</body>")])).toBe(false);
  });

  it("rejects when <body> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("rejects empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("works when the doc is split across beats", () => {
    const beats = [
      beat("<!DOCTYPE html><html><head></head>"),
      beat("<body><p>hello</p></body>"),
      beat("</html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });
});

// ── cleanGeneratedHtml ─────────────────────────────────────────────────────
describe("cleanGeneratedHtml", () => {
  it("strips ```html fence", () => {
    expect(cleanGeneratedHtml("```html\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });

  it("strips plain ``` fence", () => {
    expect(cleanGeneratedHtml("```\n<p>test</p>\n```")).toBe("<p>test</p>");
  });

  it("passes through unfenced content", () => {
    expect(cleanGeneratedHtml("<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });

  it("handles null/undefined gracefully via empty string fallback", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

// ── applyEdits ─────────────────────────────────────────────────────────────
describe("applyEdits", () => {
  const code = `<html><body><h1>Hello</h1><p>World</p></body></html>`;

  it("applies a single edit", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "Hello", replace: "Hi" }]);
    expect(out).toContain("Hi");
    expect(out).not.toContain("Hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(out).toContain("Hi");
    expect(out).toContain("Earth");
    expect(applied).toBe(2);
  });

  it("only replaces the first occurrence", () => {
    const { code: out } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(out).toBe("baa");
  });

  it("skips edits where find is not present", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "NotThere", replace: "x" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("skips malformed edits (empty find)", () => {
    const { applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("skips null/undefined edits in array", () => {
    const { applied } = applyEdits(code, [null as unknown as { find: string; replace: string }]);
    expect(applied).toBe(0);
  });

  it("returns original code when no edits are given", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
});
