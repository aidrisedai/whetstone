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
  it("concatenates all beat code in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];
  it("returns beats up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });
  it("index 0 returns first beat only", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });
  it("index beyond length returns all", () => {
    expect(assembleBeatsUpTo(beats, 10)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat('<!DOCTYPE html><html><head></head><body></body></html>'),
  ];
  it("accepts a valid HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });
  it("rejects empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
  it("rejects document missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });
  it("rejects document missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });
  it("rejects document missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<div>hi</div>\n```")).toBe("<div>hi</div>");
    expect(cleanGeneratedHtml("```\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });
  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<div>hi</div>")).toBe("<div>hi</div>");
  });
  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const code = "<html><body>Hello</body></html>";

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello", replace: "World" },
    ]);
    expect(out).toBe("<html><body>World</body></html>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "<html>", replace: "<html lang='en'>" },
      { find: "Hello", replace: "World" },
    ]);
    expect(out).toContain("lang='en'");
    expect(out).toContain("World");
    expect(applied).toBe(2);
  });

  it("returns 0 applied when find string is not present", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "NOT_THERE", replace: "x" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const dup = "aa";
    const { code: out } = applyEdits(dup, [{ find: "a", replace: "b" }]);
    expect(out).toBe("ba");
  });

  it("skips edits with empty find strings", () => {
    const { applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
});
