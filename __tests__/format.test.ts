import { describe, it, expect } from "vitest";
import { cleanGeneratedHtml, applyEdits, uid, assembleBeats, beatsFormValidDoc } from "../lib/format";
import type { EditOp, CodeBeat } from "../lib/types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "say",
  isNew: true,
});

describe("cleanGeneratedHtml", () => {
  it("removes html code fence", () => {
    const result = cleanGeneratedHtml("```html\n<div>hi</div>\n```");
    expect(result).toBe("<div>hi</div>");
  });

  it("removes generic code fence", () => {
    expect(cleanGeneratedHtml("```\n<div>x</div>\n```")).toBe("<div>x</div>");
  });

  it("returns clean HTML unchanged", () => {
    const html = "<html><body>clean</body></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a find-and-replace edit", () => {
    const code = "const x = 1;\nconst y = 2;";
    const edits: EditOp[] = [{ find: "const x = 1;", replace: "const x = 42;" }];
    const { code: result, applied } = applyEdits(code, edits);
    expect(result).toContain("const x = 42;");
    expect(applied).toBe(1);
  });

  it("counts misses for non-matching finds", () => {
    const { applied } = applyEdits("const a = 1;", [{ find: "const b = 2;", replace: "const b = 99;" }]);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in sequence", () => {
    const { code: result, applied } = applyEdits("a b c", [
      { find: "a", replace: "X" },
      { find: "c", replace: "Z" },
    ]);
    expect(result).toBe("X b Z");
    expect(applied).toBe(2);
  });

  it("skips empty find strings", () => {
    const { applied } = applyEdits("hello", [{ find: "", replace: "X" }]);
    expect(applied).toBe(0);
  });
});

describe("uid", () => {
  it("generates a string with the given prefix", () => {
    expect(uid("test")).toMatch(/^test_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid("x")));
    expect(ids.size).toBe(100);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("beatsFormValidDoc", () => {
  const fullDoc =
    "<!DOCTYPE html><html><head></head><body>hello</body></html>";

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(fullDoc)])).toBe(true);
  });

  it("returns false for partial HTML", () => {
    expect(beatsFormValidDoc([beat("<div>partial</div>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});
