import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
  uid,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

function beat(code: string): CodeBeat {
  return { label: "test", lang: "html", code, say: "", isNew: true };
}

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(0);
  });

  it("uses the given prefix", () => {
    expect(uid("part")).toMatch(/^part_/);
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 20 }, () => uid()));
    expect(ids.size).toBe(20);
  });
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
  it("includes beats up to and including the given index", () => {
    expect(assembleBeatsUpTo([beat("a"), beat("b"), beat("c")], 1)).toBe("ab");
  });

  it("returns full assembly when index is last", () => {
    const beats = [beat("x"), beat("y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("xy");
  });

  it("returns first beat for index 0", () => {
    expect(assembleBeatsUpTo([beat("a"), beat("b")], 0)).toBe("a");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = "<!DOCTYPE html><html><body><p>hi</p></body></html>";

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false if missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false if missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false if missing <body", () => {
    const noBody = "<!DOCTYPE html><html></html>";
    expect(beatsFormValidDoc([beat(noBody)])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips ```html ... ``` fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single edit", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("aXb", [
      { find: "X", replace: "Y" },
      { find: "b", replace: "c" },
    ]);
    expect(code).toBe("aYc");
    expect(applied).toBe(2);
  });

  it("skips edits where find string is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "moon", replace: "sun" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips invalid edit entries", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "ignored" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns original code for empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
