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
  label: "test",
  lang: "html",
  code,
  say: "",
  isNew,
});

describe("uid", () => {
  it("generates unique ids with the given prefix", () => {
    const a = uid("m");
    const b = uid("m");
    expect(a).toMatch(/^m_/);
    expect(b).toMatch(/^m_/);
    expect(a).not.toBe(b);
  });

  it("defaults to 'm' prefix", () => {
    expect(uid()).toMatch(/^m_/);
  });

  it("accepts custom prefix", () => {
    expect(uid("part")).toMatch(/^part_/);
    expect(uid("q")).toMatch(/^q_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat codes in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<html>"), beat("</html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><html></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles beats from 0 up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C"), beat("D")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });

  it("returns empty string for index beyond array", () => {
    expect(assembleBeatsUpTo([], 0)).toBe("");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    '<!DOCTYPE html><html lang="en"><head></head><body>hello</body></html>';

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("assembles multiple beats before checking", () => {
    const parts = [
      beat("<!DOCTYPE html><html>"),
      beat("<head></head>"),
      beat("<body>hi</body></html>"),
    ];
    expect(beatsFormValidDoc(parts)).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const input = "```html\n<!DOCTYPE html><html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html><html></html>");
  });

  it("strips plain code fences", () => {
    const input = "```\n<!DOCTYPE html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html>");
  });

  it("leaves clean HTML untouched", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <!DOCTYPE html>  ")).toBe("<!DOCTYPE html>");
  });
});

describe("applyEdits", () => {
  const code = `<html>\n<body>\n  <h1>Hello</h1>\n  <p>World</p>\n</body>\n</html>`;

  it("applies a single exact find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "<h1>Hello</h1>", replace: "<h1>Greetings</h1>" },
    ]);
    expect(applied).toBe(1);
    expect(out).toContain("<h1>Greetings</h1>");
    expect(out).not.toContain("<h1>Hello</h1>");
  });

  it("applies multiple edits in sequence", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "<h1>Hello</h1>", replace: "<h1>Hi</h1>" },
      { find: "<p>World</p>", replace: "<p>Earth</p>" },
    ]);
    expect(applied).toBe(2);
    expect(out).toContain("<h1>Hi</h1>");
    expect(out).toContain("<p>Earth</p>");
  });

  it("skips edits where find string is not found", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "<h2>Not Here</h2>", replace: "<h2>Whatever</h2>" },
    ]);
    expect(applied).toBe(0);
    expect(out).toBe(code);
  });

  it("returns applied=0 when nothing matches, original code unchanged", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "NOPE", replace: "ALSO NOPE" },
    ]);
    expect(applied).toBe(0);
    expect(out).toBe(code);
  });

  it("skips malformed edits (empty find)", () => {
    const { applied } = applyEdits(code, [
      { find: "", replace: "something" },
    ]);
    expect(applied).toBe(0);
  });

  it("returns original code untouched for empty edits array", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(applied).toBe(0);
    expect(out).toBe(code);
  });

  it("replaces only the first occurrence of the find string", () => {
    const dup = "<p>Same</p><p>Same</p>";
    const { code: out, applied } = applyEdits(dup, [
      { find: "<p>Same</p>", replace: "<p>Changed</p>" },
    ]);
    expect(applied).toBe(1);
    expect(out).toBe("<p>Changed</p><p>Same</p>");
  });
});
