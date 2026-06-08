import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string): CodeBeat => ({
  label: "beat",
  lang: "html",
  code,
  say: "narration",
  isNew: true,
});

describe("uid", () => {
  it("returns a non-empty string", () => expect(uid()).toBeTruthy());
  it("includes prefix", () => expect(uid("x").startsWith("x_")).toBe(true));
  it("returns unique values", () => expect(uid()).not.toBe(uid()));
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats up to and including index", () => {
    expect(assembleBeatsUpTo([beat("a"), beat("b"), beat("c")], 1)).toBe("ab");
  });
  it("includes all beats at last index", () => {
    expect(assembleBeatsUpTo([beat("x"), beat("y")], 1)).toBe("xy");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = "<!DOCTYPE html>\n<html><head></head><body>hi</body></html>";
  it("accepts a valid HTML document", () =>
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true));
  it("rejects missing DOCTYPE", () =>
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false));
  it("rejects missing closing html tag", () =>
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false));
  it("rejects empty beats", () => expect(beatsFormValidDoc([])).toBe(false));
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("strips generic fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });
  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });
  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("replaces first occurrence only", () => {
    const { code, applied } = applyEdits("aXa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("bXa");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "hello", replace: "hi" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("hi earth");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("abc", [{ find: "xyz", replace: "123" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "!" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("returns 0 applied for empty edits array", () => {
    const { applied } = applyEdits("abc", []);
    expect(applied).toBe(0);
  });
});
