import { describe, it, expect } from "vitest";
import { uid, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml, applyEdits } from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, isNew = false): CodeBeat => ({ label: "l", lang: "html", code, say: "", isNew });

describe("uid", () => {
  it("returns a string containing the prefix", () => {
    expect(uid("msg")).toContain("msg");
  });

  it("generates unique IDs", () => {
    const ids = Array.from({ length: 100 }, () => uid("x"));
    expect(new Set(ids).size).toBe(100);
  });

  it("works with empty prefix", () => {
    const id = uid("");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("body"), beat("</html>")];
    expect(assembleBeats(beats)).toBe("<html>body</html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles only up to the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = [
    beat("<!DOCTYPE html><html><head></head><body>hello</body></html>"),
  ];

  it("returns true for a valid HTML document across beats", () => {
    expect(beatsFormValidDoc(validHtml)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles empty / null input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = '<h1 id="title">Hello</h1>\n<p>World</p>';

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toContain("Hi");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(code).toContain("Hi");
    expect(code).toContain("Earth");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when the find string is not in the code", () => {
    const { applied } = applyEdits(base, [{ find: "NONEXISTENT", replace: "nope" }]);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "x" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });
});
