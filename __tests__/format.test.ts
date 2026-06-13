import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  uid,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, label = "step"): CodeBeat => ({
  label,
  lang: "html",
  code,
  say: "",
  isNew: false,
});

describe("uid", () => {
  it("returns a non-empty string", () => expect(uid()).toMatch(/^m_/));
  it("generates unique values", () => expect(uid()).not.toBe(uid()));
  it("respects custom prefix", () => expect(uid("x")).toMatch(/^x_/));
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    expect(assembleBeats([beat("<html>"), beat("</html>")])).toBe("<html></html>");
  });
  it("returns empty string for empty array", () => expect(assembleBeats([])).toBe(""));
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];
  it("returns up to and including the index", () => expect(assembleBeatsUpTo(beats, 1)).toBe("AB"));
  it("index 0 returns only first beat", () => expect(assembleBeatsUpTo(beats, 0)).toBe("A"));
  it("last index returns all", () => expect(assembleBeatsUpTo(beats, 2)).toBe("ABC"));
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html><html><body><p>hello</p></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for a fragment without DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<div>hi</div>")])).toBe(false);
  });

  it("returns false for missing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for missing <body", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html and trailing ```", () => {
    expect(cleanGeneratedHtml("```html\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });

  it("strips plain ``` fences", () => {
    expect(cleanGeneratedHtml("```\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });

  it("leaves clean HTML untouched", () => {
    expect(cleanGeneratedHtml("<div>hi</div>")).toBe("<div>hi</div>");
  });

  it("handles null/undefined gracefully", () => {
    // @ts-expect-error intentional
    expect(() => cleanGeneratedHtml(null)).not.toThrow();
  });
});

describe("applyEdits", () => {
  it("applies a single find-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "A" },
      { find: "b", replace: "B" },
    ]);
    expect(code).toBe("ABc");
    expect(applied).toBe(2);
  });

  it("skips edits with no match and counts correctly", () => {
    const { code, applied } = applyEdits("abc", [{ find: "xyz", replace: "Z" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("only replaces first match", () => {
    const { code } = applyEdits("aa", [{ find: "a", replace: "B" }]);
    expect(code).toBe("Ba");
  });

  it("skips malformed edit entries", () => {
    // @ts-expect-error intentional
    const { applied } = applyEdits("abc", [null, { find: "", replace: "X" }]);
    expect(applied).toBe(0);
  });
});
