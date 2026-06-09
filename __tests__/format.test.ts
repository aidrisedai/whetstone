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

const beat = (code: string, lang: CodeBeat["lang"] = "html", isNew = true): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "say",
  isNew,
});

describe("uid", () => {
  it("generates unique ids with prefix", () => {
    const a = uid("m");
    const b = uid("m");
    expect(a).not.toBe(b);
    expect(a.startsWith("m_")).toBe(true);
  });

  it("defaults prefix to 'm'", () => {
    expect(uid().startsWith("m_")).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles only up to and including index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml =
    "<!DOCTYPE html><html><head><title>T</title></head><body><p>Hi</p></body></html>";

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false if missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false if missing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false if missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const input = "```html\n<div>hello</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hello</div>");
  });

  it("strips plain code fences", () => {
    expect(cleanGeneratedHtml("```\n<b>hi</b>\n```")).toBe("<b>hi</b>");
  });

  it("leaves clean HTML alone", () => {
    expect(cleanGeneratedHtml("<div>hello</div>")).toBe("<div>hello</div>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-replace edit", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple edits sequentially", () => {
    const { code, applied } = applyEdits("aaa bbb ccc", [
      { find: "aaa", replace: "111" },
      { find: "ccc", replace: "333" },
    ]);
    expect(code).toBe("111 bbb 333");
    expect(applied).toBe(2);
  });

  it("skips edits where find string is not present", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "MISSING", replace: "x" }]);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("a a a", [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
    expect(applied).toBe(1);
  });

  it("skips invalid edit entries", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
