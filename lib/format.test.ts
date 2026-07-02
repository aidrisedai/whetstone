import { describe, expect, it } from "vitest";
import { applyEdits, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml } from "./format";
import type { CodeBeat } from "./types";

function beat(code: string, overrides: Partial<CodeBeat> = {}): CodeBeat {
  return { label: "beat", lang: "html", code, say: "", isNew: true, ...overrides };
}

describe("assembleBeats / assembleBeatsUpTo", () => {
  const beats = [beat("<a>"), beat("<b>"), beat("<c>")];

  it("concatenates all beats in order", () => {
    expect(assembleBeats(beats)).toBe("<a><b><c>");
  });

  it("concatenates only up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("<a><b>");
    expect(assembleBeatsUpTo(beats, 0)).toBe("<a>");
  });
});

describe("beatsFormValidDoc", () => {
  it("accepts a well-formed HTML document split across beats", () => {
    const beats = [
      beat("<!DOCTYPE html><html><head></head><body>"),
      beat("<h1>Hi</h1>"),
      beat("</body></html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("rejects a doc missing the doctype", () => {
    const beats = [beat("<html><body>hi</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("rejects a doc that never closes </html>", () => {
    const beats = [beat("<!DOCTYPE html><html><body>hi")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("rejects an empty beat list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips a leading/trailing markdown code fence", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles null/undefined input", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies each edit at the first exact match, in order", () => {
    const result = applyEdits("hello world", [
      { find: "hello", replace: "goodbye" },
      { find: "world", replace: "earth" },
    ]);
    expect(result.code).toBe("goodbye earth");
    expect(result.applied).toBe(2);
  });

  it("skips edits whose find text isn't present", () => {
    const result = applyEdits("hello world", [{ find: "missing", replace: "x" }]);
    expect(result.code).toBe("hello world");
    expect(result.applied).toBe(0);
  });

  it("skips malformed edit entries without throwing", () => {
    const result = applyEdits("hello", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(result.applied).toBe(0);
    expect(result.code).toBe("hello");
  });
});
