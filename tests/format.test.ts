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
  it("returns a string", () => {
    expect(typeof uid()).toBe("string");
  });

  it("uses the provided prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
    expect(uid("u").startsWith("u_")).toBe(true);
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("concatenates beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C"), beat("D")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 3)).toBe("ABCD");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when missing closing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    expect(cleanGeneratedHtml("```html\n<div>test</div>\n```")).toBe("<div>test</div>");
    expect(cleanGeneratedHtml("```\n<div>test</div>\n```")).toBe("<div>test</div>");
  });

  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<div>test</div>")).toBe("<div>test</div>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <div>test</div>  ")).toBe("<div>test</div>");
  });
});

describe("applyEdits", () => {
  const base = `<div class="old">Hello World</div>`;

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "old", replace: "new" }]);
    expect(code).toBe(`<div class="new">Hello World</div>`);
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "old", replace: "new" },
      { find: "Hello", replace: "Hi" },
    ]);
    expect(code).toBe(`<div class="new">Hi World</div>`);
    expect(applied).toBe(2);
  });

  it("returns applied=0 when no match found", () => {
    const { code, applied } = applyEdits(base, [{ find: "notfound", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips invalid edits (empty find string)", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("replaces only the first match", () => {
    const code = "abc abc abc";
    const { code: out, applied } = applyEdits(code, [{ find: "abc", replace: "xyz" }]);
    expect(out).toBe("xyz abc abc");
    expect(applied).toBe(1);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
