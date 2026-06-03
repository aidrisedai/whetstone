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

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "say",
  isNew,
});

describe("uid", () => {
  it("returns a non-empty string", () => expect(uid()).toBeTruthy());
  it("uses the given prefix", () => expect(uid("x").startsWith("x_")).toBe(true));
  it("returns unique values on successive calls", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });
  it("returns empty string for no beats", () => expect(assembleBeats([])).toBe(""));
});

describe("assembleBeatsUpTo", () => {
  it("includes beats up to the given index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
  it("includes all beats at the last index", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>`;
  const validBeats = [beat(validDoc)];

  it("accepts a valid HTML document", () => expect(beatsFormValidDoc(validBeats)).toBe(true));
  it("rejects an empty beats array", () => expect(beatsFormValidDoc([])).toBe(false));
  it("rejects beats without <!DOCTYPE html>", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("rejects beats without closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("rejects beats without <body>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
  it("handles split beats that assemble into a valid doc", () => {
    const parts = [beat("<!DOCTYPE html><html><head></head>"), beat("<body></body></html>")];
    expect(beatsFormValidDoc(parts)).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ``` fences", () => {
    expect(cleanGeneratedHtml("```html\n<html/>")).toBe("<html/>");
  });
  it("strips trailing ``` fences", () => {
    expect(cleanGeneratedHtml("<html/>\n```")).toBe("<html/>");
  });
  it("strips both fences together", () => {
    expect(cleanGeneratedHtml("```\n<html/>\n```")).toBe("<html/>");
  });
  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<html/>")).toBe("<html/>");
  });
  it("trims whitespace", () => {
    expect(cleanGeneratedHtml("  <html/>  ")).toBe("<html/>");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("a b c", [
      { find: "a", replace: "X" },
      { find: "b", replace: "Y" },
    ]);
    expect(code).toBe("X Y c");
    expect(applied).toBe(2);
  });

  it("only replaces the first occurrence", () => {
    const { code, applied } = applyEdits("aa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("ba");
    expect(applied).toBe(1);
  });

  it("counts only edits that matched", () => {
    const { applied } = applyEdits("hello", [
      { find: "xyz", replace: "abc" },
      { find: "hello", replace: "hi" },
    ]);
    expect(applied).toBe(1);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles malformed edit objects gracefully", () => {
    const { code, applied } = applyEdits("hello", [
      null as unknown as { find: string; replace: string },
      { find: "hello", replace: "hi" },
    ]);
    expect(code).toBe("hi");
    expect(applied).toBe(1);
  });

  it("returns the original code when no edits match", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
