import { describe, it, expect } from "vitest";
import { uid, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, applyEdits, cleanGeneratedHtml } from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "",
  isNew: true,
});

describe("uid", () => {
  it("returns unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid("x")));
    expect(ids.size).toBe(100);
  });
  it("uses the given prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("hello "), beat("world")];
    expect(assembleBeats(beats)).toBe("hello world");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns beats up to and including the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html lang="en"><head></head><body>hi</body></html>`;

  it("returns true for a valid HTML doc", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });
  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("returns false when missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("returns false when missing closing html tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });
  it("applies only the first match", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });
  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "A" },
      { find: "b", replace: "B" },
    ]);
    expect(code).toBe("ABc");
    expect(applied).toBe(2);
  });
  it("skips invalid edit entries", () => {
    const { applied } = applyEdits("hello", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<div/>\n```")).toBe("<div/>");
    expect(cleanGeneratedHtml("```\n<div/>\n```")).toBe("<div/>");
  });
  it("leaves plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<div/>")).toBe("<div/>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
