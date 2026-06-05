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

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "chunk",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

describe("uid", () => {
  it("produces different ids on successive calls", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it("uses the given prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
  });

  it("defaults to 'm' prefix", () => {
    expect(uid().startsWith("m_")).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("includes all when index is last", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("XY");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = "<!DOCTYPE html><html><head></head><body>hello</body></html>";

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for beats without doctype", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ```", () => {
    const raw = "```html\n<p>Hello</p>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<p>Hello</p>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<p>x</p>\n```")).toBe("<p>x</p>");
  });

  it("returns plain text unchanged", () => {
    expect(cleanGeneratedHtml("<p>clean</p>")).toBe("<p>clean</p>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "vitest" }]);
    expect(code).toBe("hello vitest");
    expect(applied).toBe(1);
  });

  it("only replaces the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("counts misses correctly", () => {
    const { applied } = applyEdits("no match", [{ find: "xyz", replace: "abc" }]);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("A B C", [
      { find: "A", replace: "1" },
      { find: "C", replace: "3" },
    ]);
    expect(code).toBe("1 B 3");
    expect(applied).toBe(2);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "X" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });
});
