import { describe, it, expect } from "vitest";
import {
  applyEdits,
  cleanGeneratedHtml,
  beatsFormValidDoc,
  assembleBeats,
  assembleBeatsUpTo,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "...",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates codes in order", () => {
    expect(assembleBeats([beat("A"), beat("B"), beat("C")])).toBe("ABC");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C"), beat("D")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });
});

describe("beatsFormValidDoc", () => {
  const VALID_DOC =
    "<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>";

  it("returns true for a valid single-file HTML doc", () => {
    expect(beatsFormValidDoc([beat(VALID_DOC)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("passes through clean HTML unchanged", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("strips a ```html ... ``` fence", () => {
    const result = cleanGeneratedHtml("```html\n<p>hi</p>\n```");
    expect(result).toBe("<p>hi</p>");
  });

  it("strips a plain ``` ... ``` fence", () => {
    const result = cleanGeneratedHtml("```\n<p>hi</p>\n```");
    expect(result).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "hello world foo bar";

  it("applies a single edit", () => {
    const { code, applied } = applyEdits(base, [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth foo bar");
    expect(applied).toBe(1);
  });

  it("applies multiple edits sequentially", () => {
    const { code, applied } = applyEdits(base, [
      { find: "hello", replace: "hi" },
      { find: "foo", replace: "baz" },
    ]);
    expect(code).toBe("hi world baz bar");
    expect(applied).toBe(2);
  });

  it("skips an edit when find is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "NOTHERE", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips an edit with an empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "X" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const { code } = applyEdits("aa aa aa", [{ find: "aa", replace: "bb" }]);
    expect(code).toBe("bb aa aa");
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
