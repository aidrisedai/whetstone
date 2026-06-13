import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "narration",
  isNew: true,
});

describe("uid", () => {
  it("generates unique ids", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it("uses the given prefix", () => {
    expect(uid("x").startsWith("x_")).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("joins only up to the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat("<!DOCTYPE html><html><head></head><body>Hello</body></html>"),
  ];
  const noDoctype = [beat("<html><body>test</body></html>")];
  const noClose = [beat("<!DOCTYPE html><html><body>test")];

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc(noDoctype)).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc(noClose)).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const fenced = "```html\n<h1>Hello</h1>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<h1>Hello</h1>");
  });

  it("strips bare code fences", () => {
    const fenced = "```\n<h1>Hello</h1>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<h1>Hello</h1>");
  });

  it("leaves unfenced HTML untouched", () => {
    const html = "<h1>Hello</h1>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  const base = '<button id="btn">Click me</button>';

  it("applies a single edit", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Click me", replace: "Press me" },
    ]);
    expect(code).toBe('<button id="btn">Press me</button>');
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "btn", replace: "submit-btn" },
      { find: "Click me", replace: "Submit" },
    ]);
    expect(code).toBe('<button id="submit-btn">Submit</button>');
    expect(applied).toBe(2);
  });

  it("skips edits where find string is not found", () => {
    const { code, applied } = applyEdits(base, [
      { find: "nonexistent", replace: "whatever" },
    ]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("replaces only the first match", () => {
    const text = "aaa";
    const { code } = applyEdits(text, [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("skips invalid edit entries", () => {
    const { code, applied } = applyEdits(base, [
      { find: "", replace: "bad" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
