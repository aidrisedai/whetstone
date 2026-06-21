import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "./format";
import type { CodeBeat } from "./types";

// ── uid ──────────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(uid()).toBeTruthy();
  });

  it("uses the supplied prefix", () => {
    expect(uid("u").startsWith("u_")).toBe(true);
    expect(uid("part").startsWith("part_")).toBe(true);
  });

  it("generates unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid("x")));
    expect(ids.size).toBe(50);
  });
});

// ── assembleBeats / assembleBeatsUpTo ────────────────────────────────────────

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates all beat codes in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the given index", () => {
    expect(assembleBeatsUpTo([beat("a"), beat("b"), beat("c")], 1)).toBe("ab");
    expect(assembleBeatsUpTo([beat("a"), beat("b"), beat("c")], 0)).toBe("a");
    expect(assembleBeatsUpTo([beat("a"), beat("b"), beat("c")], 2)).toBe("abc");
  });
});

// ── beatsFormValidDoc ────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html><head></head><body></body></html>`;

  it("returns true for a well-formed HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><head></head><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
    expect(beatsFormValidDoc([beat("")])).toBe(false);
  });

  it("returns false when <body> tag is absent", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

// ── applyEdits ───────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const base = `<html><body>Hello</body></html>`;

  it("applies a single matching edit", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "World" }]);
    expect(code).toBe("<html><body>World</body></html>");
    expect(applied).toBe(1);
  });

  it("applies edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "<body>", replace: "<body class=\"main\">" },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(code).toBe(`<html><body class="main">Hi</body></html>`);
    expect(applied).toBe(2);
  });

  it("skips edits where the find string is not present", () => {
    const { code, applied } = applyEdits(base, [{ find: "NotPresent", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("handles empty edit list", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});

// ── cleanGeneratedHtml ───────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("passes through plain HTML unchanged", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("strips leading/trailing code fences", () => {
    const fenced = "```html\n<!DOCTYPE html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html>");
  });

  it("strips bare backtick fences", () => {
    const fenced = "```\n<!DOCTYPE html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  hello  ")).toBe("hello");
  });

  it("handles empty input gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
