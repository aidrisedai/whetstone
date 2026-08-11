import { describe, expect, it } from "vitest";
import { applyEdits, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml } from "../format";
import type { CodeBeat } from "../types";

function beat(code: string): CodeBeat {
  return { label: "x", lang: "html", code, say: "", isNew: false };
}

describe("assembleBeats / assembleBeatsUpTo", () => {
  const beats = [beat("<a>"), beat("<b>"), beat("<c>")];

  it("concatenates all beats in order", () => {
    expect(assembleBeats(beats)).toBe("<a><b><c>");
  });

  it("concatenates only beats up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("<a>");
    expect(assembleBeatsUpTo(beats, 1)).toBe("<a><b>");
    expect(assembleBeatsUpTo(beats, -1)).toBe("");
  });
});

describe("beatsFormValidDoc", () => {
  it("accepts a well-formed document assembled from beats", () => {
    const beats = [
      beat("<!DOCTYPE html><html><body>"),
      beat("<h1>Hi</h1>"),
      beat("</body></html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("rejects an empty beat list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("rejects a doc missing the doctype", () => {
    expect(beatsFormValidDoc([beat("<html><body>hi</body></html>")])).toBe(false);
  });

  it("rejects a doc that never opens a body tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("rejects a doc that doesn't close with </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>hi</body>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves plain HTML untouched aside from trimming", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles null/undefined input safely", () => {
    // @ts-expect-error exercising runtime guard
    expect(cleanGeneratedHtml(undefined)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies each find/replace on the first exact match, in order", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "hello", replace: "goodbye" },
      { find: "world", replace: "moon" },
    ]);
    expect(code).toBe("goodbye moon");
    expect(applied).toBe(2);
  });

  it("skips edits whose find text isn't present", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "missing", replace: "x" }]);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("skips malformed edit entries without throwing", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
      // @ts-expect-error exercising runtime guard against a null entry
      null,
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence of a repeated match", () => {
    const { code, applied } = applyEdits("a a a", [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
    expect(applied).toBe(1);
  });
});
