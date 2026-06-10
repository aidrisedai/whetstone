import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "...",
  isNew: true,
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
  it("includes only beats up to (inclusive) the index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const valid = [
    beat("<!DOCTYPE html><html><body>"),
    beat("</body></html>"),
  ];
  it("accepts a valid document", () => {
    expect(beatsFormValidDoc(valid)).toBe(true);
  });
  it("rejects empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("rejects missing doctype", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("rejects missing closing html tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("rejects missing body tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("applies a single exact replacement", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("aXbYc", [
      { find: "X", replace: "1" },
      { find: "Y", replace: "2" },
    ]);
    expect(code).toBe("a1b2c");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips malformed edits (empty find)", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "boom" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const { code } = applyEdits("aXaXa", [{ find: "X", replace: "O" }]);
    expect(code).toBe("aOaXa");
  });

  it("returns empty applied count for empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    const fenced = "```html\n<!DOCTYPE html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html>");
  });
  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\ncode\n```")).toBe("code");
  });
  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});
