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
  label: "Beat",
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
  it("uses prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });
});

describe("assembleBeats", () => {
  it("concatenates codes in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });
  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
  it("single beat at index 0", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("X");
  });
});

describe("beatsFormValidDoc", () => {
  const valid = "<!DOCTYPE html><html><head></head><body>hello</body></html>";
  it("returns true for a full valid HTML doc", () => {
    expect(beatsFormValidDoc([beat(valid)])).toBe(true);
  });
  it("returns false for empty", () => {
    expect(beatsFormValidDoc([])).toBe(false);
    expect(beatsFormValidDoc([beat("")])).toBe(false);
  });
  it("returns false for partial doc (no closing tag)", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
  it("returns false for doc missing body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const fenced = "```html\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<div>hello</div>");
  });
  it("passes clean HTML through", () => {
    const html = "<div>hi</div>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });
  it("handles empty / whitespace", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    expect(cleanGeneratedHtml("   ")).toBe("");
  });
  it("strips unlabelled fences", () => {
    const fenced = "```\n<b>bold</b>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<b>bold</b>");
  });
});

describe("applyEdits", () => {
  it("applies a simple find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "vitest" }]);
    expect(code).toBe("hello vitest");
    expect(applied).toBe(1);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("applies multiple edits sequentially", () => {
    const { code, applied } = applyEdits("foo bar", [
      { find: "foo", replace: "baz" },
      { find: "bar", replace: "qux" },
    ]);
    expect(code).toBe("baz qux");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not present", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("ignores invalid edit ops", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
