import { describe, it, expect } from "vitest";
import { applyEdits, cleanGeneratedHtml, assembleBeats, beatsFormValidDoc } from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "l",
  lang,
  code,
  say: "s",
  isNew: true,
});

describe("applyEdits", () => {
  const base = "<html><body>Hello world</body></html>";

  it("applies a single edit on the first exact match", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello world", replace: "Goodbye" }]);
    expect(code).toBe("<html><body>Goodbye</body></html>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "world", replace: "there" },
    ]);
    expect(code).toContain("Hi there");
    expect(applied).toBe(2);
  });

  it("skips edits where find string is not present", () => {
    const { code, applied } = applyEdits(base, [{ find: "not-there", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const src = "aaa";
    const { code } = applyEdits(src, [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("skips edits with empty find strings", () => {
    const { applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips opening and closing code fences", () => {
    const raw = "```html\n<html></html>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<html></html>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles empty/null-ish input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml("  ")).toBe("");
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = "<!DOCTYPE html><html><head></head><body>hi</body></html>";

  it("returns true for a valid HTML document in beats", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for beats missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false if closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
});
