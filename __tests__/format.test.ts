import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

function beat(code: string, isNew = true): CodeBeat {
  return { label: "L", lang: "html", code, say: "", isNew };
}

describe("assembleBeats", () => {
  it("concatenates code strings in order", () => {
    expect(assembleBeats([beat("A"), beat("B"), beat("C")])).toBe("ABC");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];
  it("returns just the first beat at index 0", () => expect(assembleBeatsUpTo(beats, 0)).toBe("A"));
  it("returns all beats at last index", () => expect(assembleBeatsUpTo(beats, 2)).toBe("ABC"));
  it("returns a middle slice", () => expect(assembleBeatsUpTo(beats, 1)).toBe("AB"));
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>\n<html><head></head><body>hi</body></html>`;
  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });
  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("returns false when </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("replaces the first occurrence of find", () => {
    const { code, applied } = applyEdits("hello world hello", [{ find: "hello", replace: "hi" }]);
    expect(code).toBe("hi world hello");
    expect(applied).toBe(1);
  });
  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("AB", [
      { find: "A", replace: "X" },
      { find: "B", replace: "Y" },
    ]);
    expect(code).toBe("XY");
    expect(applied).toBe(2);
  });
  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
  it("returns original code when edits array is empty", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ```html ... ``` fences", () => {
    const input = "```html\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });
  it("strips ``` ... ``` fences (no lang)", () => {
    const input = "```\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });
  it("leaves unfenced HTML untouched", () => {
    const input = "<div>hello</div>";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });
  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
