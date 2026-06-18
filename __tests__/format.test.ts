import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

describe("uid", () => {
  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid("m")));
    expect(ids.size).toBe(50);
  });

  it("includes the given prefix", () => {
    expect(uid("hello")).toMatch(/^hello_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    "<!DOCTYPE html><html><head></head><body>Hello</body></html>";

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when doctype is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing html tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    const input = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("strips plain code fences without language tag", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("passes through clean HTML unchanged", () => {
    expect(cleanGeneratedHtml("<html></html>")).toBe("<html></html>");
  });

  it("handles null/empty gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const code = "Hello World! Hello again!";

  it("applies a single find-and-replace on first occurrence", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
    ]);
    expect(result).toBe("Hi World! Hello again!");
    expect(applied).toBe(1);
  });

  it("applies multiple edits sequentially", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(result).toBe("Hi Earth! Hello again!");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not in the string", () => {
    const { code: result, applied } = applyEdits(code, [
      { find: "MISSING", replace: "nothing" },
    ]);
    expect(result).toBe(code);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });
});
