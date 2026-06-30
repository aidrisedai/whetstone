import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew,
});

// ── uid ───────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(uid()).toBeTruthy();
  });

  it("uses the given prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 20 }, () => uid()));
    expect(ids.size).toBe(20);
  });
});

// ── assembleBeats ─────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ──────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("handles index 0", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

// ── beatsFormValidDoc ─────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validHtml = [
    beat("<!DOCTYPE html><html><head></head>"),
    beat("<body>hello</body></html>"),
  ];

  it("returns true for valid assembled HTML", () => {
    expect(beatsFormValidDoc(validHtml)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ```", () => {
    const input = "```html\n<!DOCTYPE html><html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html><html></html>");
  });

  it("strips plain ``` fences", () => {
    const input = "```\n<b>hi</b>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<b>hi</b>");
  });

  it("passes through clean html unchanged", () => {
    const clean = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(clean)).toBe(clean);
  });

  it("handles empty/null input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml(null as never)).toBe("");
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const code = `<html><body><h1>Title</h1></body></html>`;

  it("applies a single edit on the first exact match", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "<h1>Title</h1>", replace: "<h1>New Title</h1>" },
    ]);
    expect(out).toBe("<html><body><h1>New Title</h1></body></html>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "<html>", replace: "<html lang='en'>" },
      { find: "</html>", replace: "</html>\n" },
    ]);
    expect(out).toContain("<html lang='en'>");
    expect(out).toContain("</html>\n");
    expect(applied).toBe(2);
  });

  it("skips an edit whose find string is not found and counts only applied", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "NOTFOUND", replace: "X" },
      { find: "<h1>Title</h1>", replace: "<h1>Yes</h1>" },
    ]);
    expect(out).toContain("<h1>Yes</h1>");
    expect(applied).toBe(1);
  });

  it("skips invalid edits (empty find, missing fields)", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "", replace: "X" },
      null as never,
      {} as never,
    ]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("applies edit only to the first occurrence", () => {
    const src = "<p>a</p><p>a</p>";
    const { code: out } = applyEdits(src, [{ find: "<p>a</p>", replace: "<p>b</p>" }]);
    expect(out).toBe("<p>b</p><p>a</p>");
  });
});
