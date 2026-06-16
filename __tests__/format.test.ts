import { describe, it, expect } from "vitest";
import {
  applyEdits,
  cleanGeneratedHtml,
  beatsFormValidDoc,
  assembleBeats,
  assembleBeatsUpTo,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies edits to the first match only", () => {
    const { code, applied } = applyEdits("aa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("ba");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("foo bar", [
      { find: "foo", replace: "baz" },
      { find: "bar", replace: "qux" },
    ]);
    expect(code).toBe("baz qux");
    expect(applied).toBe(2);
  });

  it("returns applied=0 when find string not in code", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips html code fences", () => {
    const input = "```html\n<html><body>hi</body></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html><body>hi</body></html>");
  });

  it("strips bare code fences", () => {
    const input = "```\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("leaves already clean HTML untouched", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <html></html>  ")).toBe("<html></html>");
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<html>"), beat("</html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><html></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles beats up to and including index", () => {
    const beats = [beat("a"), beat("b"), beat("c"), beat("d")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });

  it("assembles all beats when index is last", () => {
    const beats = [beat("x"), beat("y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("xy");
  });

  it("returns first beat for index 0", () => {
    const beats = [beat("only"), beat("extra")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("only");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    const nob = "<!DOCTYPE html><html><head></head></html>";
    expect(beatsFormValidDoc([beat(nob)])).toBe(false);
  });

  it("is case-insensitive for DOCTYPE", () => {
    const lower = "<!doctype html><html><body></body></html>";
    expect(beatsFormValidDoc([beat(lower)])).toBe(true);
  });
});
