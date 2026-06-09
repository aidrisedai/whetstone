import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
  uid,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "",
  isNew: true,
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

describe("assembleBeatsUpTo", () => {
  it("returns only beats up to and including index", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });

  it("returns first beat at index 0", () => {
    const beats = [beat("x"), beat("y")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("x");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html>
<html>
<body>hello</body>
</html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for empty code", () => {
    expect(beatsFormValidDoc([beat("")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips opening and closing triple backticks", () => {
    expect(cleanGeneratedHtml("```html\n<html/>\n```")).toBe("<html/>");
  });

  it("strips plain backtick fences", () => {
    expect(cleanGeneratedHtml("```\n<html/>\n```")).toBe("<html/>");
  });

  it("returns unchanged HTML without fences", () => {
    expect(cleanGeneratedHtml("<html/>")).toBe("<html/>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <html/>  ")).toBe("<html/>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("<p>hello</p>", [
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("<p>world</p>");
    expect(applied).toBe(1);
  });

  it("applies only the first match (not global)", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("<p>hello</p>", [
      { find: "missing", replace: "x" },
    ]);
    expect(code).toBe("<p>hello</p>");
    expect(applied).toBe(0);
  });

  it("applies multiple edits sequentially", () => {
    const { code, applied } = applyEdits("foo bar baz", [
      { find: "foo", replace: "FOO" },
      { find: "bar", replace: "BAR" },
    ]);
    expect(code).toBe("FOO BAR baz");
    expect(applied).toBe(2);
  });

  it("skips malformed edit objects", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "x" }, // empty find — skip
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("world");
    expect(applied).toBe(1);
  });
});

describe("uid", () => {
  it("returns a string", () => {
    expect(typeof uid()).toBe("string");
  });

  it("uses the provided prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 20 }, () => uid()));
    expect(ids.size).toBe(20);
  });
});
