import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index only", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head>"),
    beat("<body>hello</body></html>"),
  ];

  it("returns true for a valid HTML document split across beats", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when missing <!DOCTYPE html>", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false when missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ```", () => {
    const input = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("strips plain ``` fences", () => {
    const input = "```\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("returns clean HTML unchanged", () => {
    const input = "<html></html>";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("handles null/undefined safely by returning empty string", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("<div>old</div>", [
      { find: "old", replace: "new" },
    ]);
    expect(code).toBe("<div>new</div>");
    expect(applied).toBe(1);
  });

  it("applies edits in order and reports count", () => {
    const { code, applied } = applyEdits("AAA", [
      { find: "A", replace: "B" }, // first A → B, yields "BAA"
      { find: "A", replace: "C" }, // first remaining A → C, yields "BCA"
    ]);
    expect(code).toBe("BCA");
    expect(applied).toBe(2);
  });

  it("reports 0 applied when find string not found", () => {
    const { code, applied } = applyEdits("<div>old</div>", [
      { find: "notfound", replace: "x" },
    ]);
    expect(code).toBe("<div>old</div>");
    expect(applied).toBe(0);
  });

  it("skips malformed edits (empty find)", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "X" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns original code for empty edits array", () => {
    const { code, applied } = applyEdits("<html></html>", []);
    expect(code).toBe("<html></html>");
    expect(applied).toBe(0);
  });
});
