import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
  uid,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

function beat(code: string, lang: CodeBeat["lang"] = "html"): CodeBeat {
  return { label: "l", lang, code, say: "s", isNew: true };
}

describe("uid", () => {
  it("generates a string", () => expect(typeof uid()).toBe("string"));
  it("uses the prefix", () => expect(uid("msg")).toMatch(/^msg_/));
  it("generates unique values", () => expect(uid()).not.toBe(uid()));
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const result = assembleBeats([beat("<html>"), beat("</html>")]);
    expect(result).toBe("<html></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("returns beats 0..index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("returns just the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });

  it("returns everything at max index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc =
    '<!DOCTYPE html><html lang="en"><head></head><body><p>hi</p></body></html>';

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const fenced = "```html\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<p>hello</p>");
  });

  it("strips backtick fences without language tag", () => {
    expect(cleanGeneratedHtml("```\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("passes through plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    // @ts-expect-error – testing runtime guard
    expect(cleanGeneratedHtml(null)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "<body>Hello world</body>";

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello", replace: "Hi" }]);
    expect(code).toBe("<body>Hi world</body>");
    expect(applied).toBe(1);
  });

  it("replaces only the FIRST match", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("applies edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("<body>Hi earth</body>");
    expect(applied).toBe(2);
  });

  it("skips edits whose find string is not present and reports correct applied count", () => {
    const { code, applied } = applyEdits(base, [
      { find: "MISSING", replace: "x" },
      { find: "Hello", replace: "Yo" },
    ]);
    expect(code).toBe("<body>Yo world</body>");
    expect(applied).toBe(1);
  });

  it("returns original code and applied=0 when no edits match", () => {
    const { code, applied } = applyEdits(base, [{ find: "NOPE", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with an empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});
