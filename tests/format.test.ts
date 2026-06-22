import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  uid,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew,
});

// ── uid ───────────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("generates unique ids across calls", () => {
    const ids = Array.from({ length: 20 }, () => uid("x"));
    expect(new Set(ids).size).toBe(20);
  });

  it("prefixes the id with the given prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
    expect(uid("u").startsWith("u_")).toBe(true);
  });

  it("uses 'm' as default prefix", () => {
    expect(uid().startsWith("m_")).toBe(true);
  });
});

// ── assembleBeats ─────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ─────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C"), beat("D")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });

  it("returns just the first beat for index 0", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const minimalHtml = "<!DOCTYPE html><html><head></head><body>hello</body></html>";

  it("accepts a minimal valid HTML document", () => {
    expect(beatsFormValidDoc([beat(minimalHtml)])).toBe(true);
  });

  it("rejects empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("rejects when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body>hi</body></html>")])).toBe(false);
  });

  it("rejects when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("rejects when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE check", () => {
    expect(beatsFormValidDoc([beat("<!doctype html><html><body>x</body></html>")])).toBe(true);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("passes through plain HTML untouched", () => {
    const html = "<!DOCTYPE html><html><body>hi</body></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("strips ```html … ``` fences", () => {
    const fenced = "```html\n<!DOCTYPE html><body>hi</body></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html><body>hi</body></html>");
  });

  it("strips plain ``` … ``` fences", () => {
    const fenced = "```\n<html>hi</html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<html>hi</html>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const base = `<!DOCTYPE html><html><body><h1>Hello</h1><p>World</p></body></html>`;

  it("applies a single edit", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toContain("Hi");
    expect(code).not.toContain("Hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(code).toContain("Hi");
    expect(code).toContain("Earth");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const code = "aaa";
    const { code: result, applied } = applyEdits(code, [{ find: "a", replace: "b" }]);
    expect(result).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits where the find string is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "NotInCode", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with an empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips null/malformed edit objects", () => {
    const { code, applied } = applyEdits(base, [
      null as unknown as { find: string; replace: string },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(code).toContain("Hi");
    expect(applied).toBe(1);
  });

  it("returns the unchanged code when the edits array is empty", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
