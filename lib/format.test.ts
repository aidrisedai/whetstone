import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew: true,
});

const validHtml = (body = "<p>hi</p>") =>
  `<!DOCTYPE html><html><head></head><body>${body}</body></html>`;

describe("assembleBeats", () => {
  it("joins beat code in order", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns beats up to and including the given index", () => {
    const beats = [beat("x"), beat("y"), beat("z")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("xy");
  });

  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("first"), beat("second")], 0)).toBe("first");
  });
});

describe("beatsFormValidDoc", () => {
  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml())])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("replaces the first occurrence of a found string", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not present", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("aaa", [
      { find: "a", replace: "b" },
      { find: "a", replace: "c" },
    ]);
    // First edit turns "aaa" → "baa", second finds the next "a" → "bca"
    expect(code).toBe("bca");
    expect(applied).toBe(2);
  });

  it("skips malformed edit entries", () => {
    const { code, applied } = applyEdits("test", [
      { find: "", replace: "noop" },
    ]);
    expect(code).toBe("test");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    const input = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("leaves clean HTML untouched", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});
