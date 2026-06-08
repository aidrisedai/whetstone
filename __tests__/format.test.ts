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

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "say",
  isNew: false,
});

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(0);
  });

  it("uses provided prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    expect(assembleBeats([beat("<html>"), beat("<body>"), beat("</body></html>")])).toBe(
      "<html><body></body></html>",
    );
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("includes only beats up to the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("includes the beat at the given index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns only the first beat for index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = [
    beat("<!DOCTYPE html>\n<html>\n<head></head>\n<body>hello</body>\n</html>"),
  ];

  it("accepts a valid HTML document", () => {
    expect(beatsFormValidDoc(validDoc)).toBe(true);
  });

  it("rejects an empty array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("rejects code missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body>hi</body></html>")])).toBe(false);
  });

  it("rejects code missing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html>\n<html><body>")])).toBe(false);
  });

  it("rejects code missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html>\n<html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html fences", () => {
    expect(cleanGeneratedHtml("```html\n<html/>\n```")).toBe("<html/>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<html/>\n```")).toBe("<html/>");
  });

  it("returns plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<html/>")).toBe("<html/>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <html/>  ")).toBe("<html/>");
  });
});

describe("applyEdits", () => {
  const code = "Hello World";

  it("applies a single find-and-replace", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "World", replace: "Vitest" }]);
    expect(out).toBe("Hello Vitest");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code: out, applied } = applyEdits("A B C", [
      { find: "A", replace: "X" },
      { find: "C", replace: "Z" },
    ]);
    expect(out).toBe("X B Z");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code: out } = applyEdits("abc abc", [{ find: "abc", replace: "xyz" }]);
    expect(out).toBe("xyz abc");
  });

  it("reports 0 applied when find not found", () => {
    const { applied } = applyEdits(code, [{ find: "missing", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("skips malformed edits (empty find)", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("returns original code for empty edits array", () => {
    const { code: out, applied } = applyEdits(code, []);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });

  it("handles edits that modify each other's output sequentially", () => {
    const { code: out } = applyEdits("aaa", [
      { find: "aaa", replace: "bbb" },
      { find: "bbb", replace: "ccc" },
    ]);
    expect(out).toBe("ccc");
  });
});
