import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

function beat(code: string, label = "chunk"): CodeBeat {
  return { code, label, lang: "html", say: "", isNew: false };
}

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats up to and including the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns single beat for index 0", () => {
    const beats = [beat("x"), beat("y")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("x");
  });

  it("returns full document for last index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html><html><head></head><body>"),
    beat("<p>Hello</p>"),
    beat("</body></html>"),
  ];

  it("returns true for a complete, valid HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false if DOCTYPE is missing", () => {
    const noDoctye = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(noDoctye)).toBe(false);
  });

  it("returns false if closing </html> tag is missing", () => {
    const noClose = [beat("<!DOCTYPE html><html><body></body>")];
    expect(beatsFormValidDoc(noClose)).toBe(false);
  });

  it("returns false if <body is missing", () => {
    const noBody = [beat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(noBody)).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences with language tag", () => {
    const input = "```html\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hello</p>");
  });

  it("strips plain code fences without a language tag", () => {
    const input = "```\n<p>hi</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hi</p>");
  });

  it("leaves plain HTML untouched", () => {
    const input = "<p>plain html</p>";
    expect(cleanGeneratedHtml(input)).toBe("<p>plain html</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("a b c", [
      { find: "a", replace: "1" },
      { find: "c", replace: "3" },
    ]);
    expect(code).toBe("1 b 3");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "missing", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("replaces only the first match", () => {
    const { code, applied } = applyEdits("a a a", [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
    expect(applied).toBe(1);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
