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

// ─── uid ─────────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("uses the given prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });

  it("defaults to 'm' prefix", () => {
    expect(uid()).toMatch(/^m_/);
  });

  it("produces unique values across calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid("t")));
    expect(ids.size).toBe(50);
  });
});

// ─── assembleBeats / assembleBeatsUpTo ────────────────────────────────────────

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew: false,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to the given index", () => {
    expect(assembleBeatsUpTo([beat("x"), beat("y"), beat("z")], 1)).toBe("xy");
  });

  it("includes the first beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("only")], 0)).toBe("only");
  });
});

// ─── beatsFormValidDoc ────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validHtml = [
    beat("<!DOCTYPE html>\n<html>\n<head></head>\n<body>"),
    beat("<p>hello</p>"),
    beat("</body></html>"),
  ];

  it("returns true for a well-formed HTML document spread across beats", () => {
    expect(beatsFormValidDoc(validHtml)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(
      beatsFormValidDoc([beat("<html><body></body></html>")]),
    ).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(
      beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")]),
    ).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    expect(
      beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")]),
    ).toBe(false);
  });
});

// ─── cleanGeneratedHtml ──────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ```", () => {
    const input = "```html\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });

  it("strips plain ``` fences", () => {
    const input = "```\n<p>hi</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hi</p>");
  });

  it("returns clean HTML unchanged", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    // @ts-expect-error intentional bad input
    expect(cleanGeneratedHtml(null)).toBe("");
    // @ts-expect-error intentional bad input
    expect(cleanGeneratedHtml(undefined)).toBe("");
  });
});

// ─── applyEdits ──────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(
      "hello world",
      [{ find: "world", replace: "Whetstone" }],
    );
    expect(code).toBe("hello Whetstone");
    expect(applied).toBe(1);
  });

  it("applies only the first match when the pattern appears multiple times", () => {
    const { code, applied } = applyEdits(
      "aaa",
      [{ find: "a", replace: "b" }],
    );
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits(
      "hello",
      [{ find: "xyz", replace: "abc" }],
    );
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple edits sequentially", () => {
    const { code, applied } = applyEdits("a b c", [
      { find: "a", replace: "1" },
      { find: "b", replace: "2" },
      { find: "c", replace: "3" },
    ]);
    expect(code).toBe("1 2 3");
    expect(applied).toBe(3);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
