import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, label = "chunk"): CodeBeat => ({
  label,
  lang: "html",
  code,
  say: "",
  isNew: true,
});

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(0);
  });

  it("uses the provided prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
  });

  it("defaults to 'm' prefix", () => {
    expect(uid().startsWith("m_")).toBe(true);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => uid()));
    expect(ids.size).toBe(20);
  });
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
  const beats = [beat("A"), beat("B"), beat("C"), beat("D")];

  it("includes beats 0..index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });

  it("returns empty for empty beats array", () => {
    expect(assembleBeatsUpTo([], 0)).toBe("");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>`;

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    const lower = `<!doctype html><html><head></head><body></body></html>`;
    expect(beatsFormValidDoc([beat(lower)])).toBe(true);
  });

  it("handles multi-beat documents", () => {
    const b1 = beat("<!DOCTYPE html><html><body>");
    const b2 = beat("</body></html>");
    expect(beatsFormValidDoc([b1, b2])).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const input = "```html\n<h1>hi</h1>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<h1>hi</h1>");
  });

  it("strips generic backtick fences", () => {
    const input = "```\n<h1>hi</h1>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<h1>hi</h1>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<h1>Hello</h1>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined gracefully via coercion", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  const base = "<h1>Hello</h1><p>World</p>";

  it("replaces the first exact match", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("<h1>Hi</h1><p>World</p>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(code).toBe("<h1>Hi</h1><p>Earth</p>");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when no matches found", () => {
    const { code, applied } = applyEdits(base, [{ find: "Nonexistent", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits with empty find string", () => {
    const { applied } = applyEdits(base, [{ find: "", replace: "X" }]);
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("handles null/malformed edit entries", () => {
    const { applied } = applyEdits(base, [
      null as unknown as { find: string; replace: string },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(applied).toBe(1);
  });

  it("can replace with an empty string (deletion)", () => {
    const { code } = applyEdits(base, [{ find: "<p>World</p>", replace: "" }]);
    expect(code).toBe("<h1>Hello</h1>");
  });
});
