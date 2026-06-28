import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const VALID =
    "<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>";

  it("accepts a minimal valid HTML doc", () => {
    expect(beatsFormValidDoc([beat(VALID)])).toBe(true);
  });
  it("rejects empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("rejects code missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("rejects code without closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips triple-backtick fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("passes through clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });
  it("trims leading/trailing whitespace", () => {
    expect(cleanGeneratedHtml("  \n<p>hi</p>\n  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  const CODE = "<body><p>hello</p></body>";

  it("applies a single replacement on first match", () => {
    const { code, applied } = applyEdits(CODE, [
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("<body><p>world</p></body>");
    expect(applied).toBe(1);
  });

  it("applies edits in order", () => {
    const { code, applied } = applyEdits(CODE, [
      { find: "<p>hello</p>", replace: "<p>first</p>" },
      { find: "first", replace: "second" },
    ]);
    expect(code).toContain("second");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not found", () => {
    const { code, applied } = applyEdits(CODE, [
      { find: "NOT_HERE", replace: "nope" },
    ]);
    expect(code).toBe(CODE);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits(CODE, [
      { find: "", replace: "injected" },
    ]);
    expect(code).toBe(CODE);
    expect(applied).toBe(0);
  });

  it("returns 0 applied for empty edits array", () => {
    const { code, applied } = applyEdits(CODE, []);
    expect(code).toBe(CODE);
    expect(applied).toBe(0);
  });
});
