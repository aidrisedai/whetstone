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
  label: "🧱 Section",
  lang: "html",
  code,
  say: "Watch this",
  isNew: true,
});

// ── assembleBeats ─────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates code from all beats in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("includes only beats 0..index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("handles index beyond array length gracefully", () => {
    expect(assembleBeatsUpTo(beats, 99)).toBe("ABC");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>`;

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    const noDoctype = `<html><body></body></html>`;
    expect(beatsFormValidDoc([beat(noDoctype)])).toBe(false);
  });

  it("returns false when closing html tag is missing", () => {
    const noClose = `<!DOCTYPE html><html><body>incomplete`;
    expect(beatsFormValidDoc([beat(noClose)])).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    const noBody = `<!DOCTYPE html><html></html>`;
    expect(beatsFormValidDoc([beat(noBody)])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    const lower = `<!doctype html><html><body></body></html>`;
    expect(beatsFormValidDoc([beat(lower)])).toBe(true);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading html code fence", () => {
    const input = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("strips leading generic code fence", () => {
    const input = "```\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("passes through bare HTML unchanged", () => {
    const input = "<html></html>";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    // @ts-expect-error testing runtime guard
    expect(() => cleanGeneratedHtml(null)).not.toThrow();
    // @ts-expect-error testing runtime guard
    expect(() => cleanGeneratedHtml(undefined)).not.toThrow();
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const code = `<div id="title">Hello World</div><p id="sub">Subtitle</p>`;

  it("applies a single find-replace edit", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello World", replace: "Hi Earth" },
    ]);
    expect(result).toContain("Hi Earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello World", replace: "Hi Earth" },
      { find: "Subtitle", replace: "Tagline" },
    ]);
    expect(result).toContain("Hi Earth");
    expect(result).toContain("Tagline");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when find string is not present", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "not-present", replace: "replacement" },
    ]);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const repeating = "ab ab ab";
    const { code: result } = applyEdits(repeating, [{ find: "ab", replace: "XX" }]);
    expect(result).toBe("XX ab ab");
  });

  it("skips edits with empty find string", () => {
    const { applied } = applyEdits(code, [{ find: "", replace: "something" }]);
    expect(applied).toBe(0);
  });

  it("skips malformed edit entries gracefully", () => {
    // @ts-expect-error testing runtime guard
    const { applied } = applyEdits(code, [null, undefined, { find: "Hello World", replace: "Hi" }]);
    expect(applied).toBe(1);
  });

  it("returns original code and applied=0 for no edits", () => {
    const { code: result, applied } = applyEdits(code, []);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });
});
