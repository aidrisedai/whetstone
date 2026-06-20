import { describe, it, expect } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "test",
  isNew: true,
});

describe("applyEdits", () => {
  it("applies a single find-and-replace edit", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies only the first match", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("foo bar baz", [
      { find: "foo", replace: "one" },
      { find: "bar", replace: "two" },
    ]);
    expect(code).toBe("one two baz");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips null/malformed edits without throwing", () => {
    const { code, applied } = applyEdits("hello", [
      null as unknown as { find: string; replace: string },
      { find: "hello", replace: "hi" },
    ]);
    expect(code).toBe("hi");
    expect(applied).toBe(1);
  });

  it("returns applied=0 when no edits land (caller should rebuild)", () => {
    const { applied } = applyEdits("unchanged", [{ find: "xyz", replace: "abc" }]);
    expect(applied).toBe(0);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>\n"), beat("<html>\n"), beat("</html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html>\n<html>\n</html>");
  });

  it("returns empty string for empty beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats from 0 to index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat("<!DOCTYPE html>\n<html lang='en'>\n<head></head>\n<body>test</body>\n</html>"),
  ];

  it("returns true for a valid HTML doc", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body>hi</body></html>")])).toBe(false);
  });

  it("returns false when missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    const input = "```html\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });

  it("strips fences without a language tag", () => {
    const input = "```\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });

  it("leaves plain HTML untouched", () => {
    const input = "<div>hello</div>";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});
