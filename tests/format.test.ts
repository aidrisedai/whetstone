import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "L",
  lang: "html",
  code,
  say: "...",
  isNew,
});

describe("uid", () => {
  it("generates unique ids", () => {
    const a = uid("m");
    const b = uid("m");
    expect(a).not.toBe(b);
  });

  it("includes the prefix", () => {
    expect(uid("part").startsWith("part_")).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles only beats 0..index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for a fragment (no doctype)", () => {
    expect(beatsFormValidDoc([beat("<div>hi</div>")])).toBe(false);
  });

  it("returns false if </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("<p>hello</p>", [
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("<p>world</p>");
    expect(applied).toBe(1);
  });

  it("applies only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not present", () => {
    const { code, applied } = applyEdits("<p>hello</p>", [
      { find: "missing", replace: "x" },
    ]);
    expect(code).toBe("<p>hello</p>");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("<p>A</p><p>B</p>", [
      { find: "A", replace: "1" },
      { find: "B", replace: "2" },
    ]);
    expect(code).toBe("<p>1</p><p>2</p>");
    expect(applied).toBe(2);
  });

  it("skips edits with empty find", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "x" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves clean HTML alone", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
