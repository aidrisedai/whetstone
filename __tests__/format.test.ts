import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "test say",
  isNew,
});

describe("uid", () => {
  it("generates unique ids", () => {
    const ids = Array.from({ length: 100 }, () => uid("m"));
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });

  it("uses the given prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
    expect(uid("part")).toMatch(/^part_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    '<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>';

  it("returns true for a valid HTML document assembled from beats", () => {
    const beats = [beat(validDoc)];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("returns false for missing <!DOCTYPE html>", () => {
    const beats = [beat("<html><body>hi</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for missing </html>", () => {
    const beats = [beat("<!DOCTYPE html><html><body>hi</body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for missing <body>", () => {
    const beats = [beat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("applies a find-and-replace edit", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "vitest" },
    ]);
    expect(code).toBe("hello vitest");
    expect(applied).toBe(1);
  });

  it("applies only the first match", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple sequential edits", () => {
    const { code, applied } = applyEdits("the quick brown fox", [
      { find: "quick", replace: "slow" },
      { find: "fox", replace: "cat" },
    ]);
    expect(code).toBe("the slow brown cat");
    expect(applied).toBe(2);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles no edits", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing markdown code fences", () => {
    const input = "```html\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("strips plain ``` fences", () => {
    const input = "```\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("leaves raw HTML untouched", () => {
    const input = "<div>hi</div>";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
