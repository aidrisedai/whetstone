import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../format";
import type { CodeBeat } from "../types";

function beat(code: string): CodeBeat {
  return { label: "l", lang: "html", code, say: "s", isNew: true };
}

const VALID_DOC = `<!DOCTYPE html><html lang="en"><head></head><body><p>hi</p></body></html>`;
const VALID_BEATS = [beat("<!DOCTYPE html>"), beat("<html>"), beat("<body></body></html>")];

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns only beats up to and including index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });
  it("returns full assembly when index is last", () => {
    const beats = [beat("x"), beat("y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("xy");
  });
});

describe("beatsFormValidDoc", () => {
  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(VALID_DOC)])).toBe(true);
  });
  it("returns false when no DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("returns false when no closing /html", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("returns false when no body tag", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("accepts a document assembled from multiple beats", () => {
    expect(
      beatsFormValidDoc([
        beat("<!DOCTYPE html><html lang='en'><head></head>"),
        beat("<body><p>hello</p></body></html>"),
      ]),
    ).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html fences", () => {
    expect(cleanGeneratedHtml("```html\n<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });
  it("strips leading ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<html>")).toBe("<html>");
  });
  it("strips trailing ``` fence", () => {
    expect(cleanGeneratedHtml("<html>\n```")).toBe("<html>");
  });
  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "<html><body><p>hello</p></body></html>";

  it("applies a single edit on first match", () => {
    const { code, applied } = applyEdits(base, [{ find: "hello", replace: "world" }]);
    expect(code).toBe("<html><body><p>world</p></body></html>");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "MISSING", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "<p>", replace: "<span>" },
      { find: "</p>", replace: "</span>" },
    ]);
    expect(code).toContain("<span>hello</span>");
    expect(applied).toBe(2);
  });

  it("ignores edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
