import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "./format";
import type { CodeBeat } from "./types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "",
  isNew: true,
});

describe("uid", () => {
  it("generates unique ids", () => {
    const ids = Array.from({ length: 100 }, () => uid("x"));
    expect(new Set(ids).size).toBe(100);
  });

  it("uses the given prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("concatenates codes in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });

  it("returns an empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("returns codes up to and including the index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns just the first beat at index 0", () => {
    const beats = [beat("A"), beat("B")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html><head></head><body>hello</body></html>`;

  it("returns true for a valid HTML doc assembled from beats", () => {
    const beats = [beat(validHtml)];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("returns false when the doc is missing DOCTYPE", () => {
    const beats = [beat(`<html><body>hi</body></html>`)];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when the doc has no </html> closing tag", () => {
    const beats = [beat(`<!DOCTYPE html><html><body>hi</body>`)];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips triple-backtick code fences", () => {
    expect(cleanGeneratedHtml("```html\n<!DOCTYPE html>\n```")).toBe("<!DOCTYPE html>");
    expect(cleanGeneratedHtml("```\n<!DOCTYPE html>\n```")).toBe("<!DOCTYPE html>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const base = `<html><body><p id="greeting">Hello</p></body></html>`;

  it("replaces the first occurrence of find with replace", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
    ]);
    expect(code).toContain("Hi");
    expect(code).not.toContain("Hello");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "<body>", replace: '<body class="main">' },
    ]);
    expect(code).toContain("Hi");
    expect(code).toContain('class="main"');
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found and counts them correctly", () => {
    const { applied } = applyEdits(base, [
      { find: "nonexistent", replace: "x" },
    ]);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
