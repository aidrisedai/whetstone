import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "test",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    expect(assembleBeats([beat("ab"), beat("cd")])).toBe("abcd");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to the given index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html>\n<html>\n<head></head>\n"),
    beat("<body>hello</body>\n</html>"),
  ];

  it("returns true for a valid HTML document assembled from beats", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("returns false when no DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body>x</body></html>")])).toBe(false);
  });

  it("returns false when no closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("applyEdits", () => {
  const code = `<html>\n<head></head>\n<body>Hello world</body>\n</html>`;

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello world", replace: "Goodbye world" },
    ]);
    expect(out).toContain("Goodbye world");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "<head></head>", replace: "<head><title>App</title></head>" },
      { find: "Hello world", replace: "Hi" },
    ]);
    expect(out).toContain("<title>App</title>");
    expect(out).toContain("Hi");
    expect(applied).toBe(2);
  });

  it("skips edits where find string is not in code", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "NOT_IN_CODE", replace: "replacement" },
    ]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const dupes = "aaa";
    const { code: out } = applyEdits(dupes, [{ find: "a", replace: "X" }]);
    expect(out).toBe("Xaa");
  });

  it("skips edits with empty find string", () => {
    const { applied } = applyEdits(code, [{ find: "", replace: "oops" }]);
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const raw = "```html\n<!DOCTYPE html>\n</html>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<!DOCTYPE html>\n</html>");
  });

  it("strips plain code fences", () => {
    const raw = "```\n<p>hi</p>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<p>hi</p>");
  });

  it("leaves plain HTML unchanged", () => {
    const raw = "<!DOCTYPE html>\n<html></html>";
    expect(cleanGeneratedHtml(raw)).toBe(raw);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});
