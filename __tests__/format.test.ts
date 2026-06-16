import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html", isNew = true): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "",
  isNew,
});

// --- uid ---

describe("uid", () => {
  it("uses the given prefix", () => expect(uid("x")).toMatch(/^x_/));
  it("defaults to 'm' prefix", () => expect(uid()).toMatch(/^m_/));
  it("is unique across calls", () => {
    const ids = Array.from({ length: 50 }, () => uid("t"));
    expect(new Set(ids).size).toBe(50);
  });
});

// --- assembleBeats ---

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// --- assembleBeatsUpTo ---

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index inclusive", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns just first beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("a"), beat("b")], 0)).toBe("a");
  });

  it("returns full file at last index", () => {
    const beats = [beat("x"), beat("y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("xy");
  });
});

// --- beatsFormValidDoc ---

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>`;

  it("returns true for a valid single-file HTML doc", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when <body is absent", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("works across multiple beats that concatenate to a valid doc", () => {
    const beats = [
      beat("<!DOCTYPE html><html><head></head>"),
      beat("<body><p>hello</p></body>"),
      beat("</html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });
});

// --- applyEdits ---

describe("applyEdits", () => {
  it("applies a single edit", () => {
    const { code, applied } = applyEdits("<div>old</div>", [
      { find: "old", replace: "new" },
    ]);
    expect(code).toBe("<div>new</div>");
    expect(applied).toBe(1);
  });

  it("replaces only the first occurrence of each find", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("skips an edit when the find string is not present", () => {
    const { code, applied } = applyEdits("<p>hello</p>", [
      { find: "MISSING", replace: "nope" },
    ]);
    expect(code).toBe("<p>hello</p>");
    expect(applied).toBe(0);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("one two three", [
      { find: "one", replace: "1" },
      { find: "two", replace: "2" },
    ]);
    expect(code).toBe("1 2 three");
    expect(applied).toBe(2);
  });

  it("ignores edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles replacement that introduces the next find string (no double-replace)", () => {
    // After replacing "a"→"ab", the code has "ab" but the edits are already past that find.
    const { code } = applyEdits("a c", [
      { find: "a", replace: "ab" },
      { find: "b", replace: "B" },
    ]);
    // "a" → "ab" → then "b" in "ab c" gets replaced → "aB c"
    expect(code).toBe("aB c");
  });

  it("returns the original code and 0 applied for empty edits array", () => {
    const { code, applied } = applyEdits("original", []);
    expect(code).toBe("original");
    expect(applied).toBe(0);
  });
});

// --- cleanGeneratedHtml ---

describe("cleanGeneratedHtml", () => {
  it("strips markdown html code fences", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("strips generic code fences", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("passes through bare HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>hello</p>")).toBe("<p>hello</p>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});
