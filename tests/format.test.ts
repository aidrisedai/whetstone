import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

function beat(code: string, lang: CodeBeat["lang"] = "html"): CodeBeat {
  return { label: "test", lang, code, say: "", isNew: true };
}

// ── assembleBeats ────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ── assembleBeatsUpTo ────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  const beats = [beat("<!DOCTYPE html>\n"), beat("<body>\n"), beat("</body></html>")];

  it("returns code up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("<!DOCTYPE html>\n");
    expect(assembleBeatsUpTo(beats, 1)).toBe("<!DOCTYPE html>\n<body>\n");
    expect(assembleBeatsUpTo(beats, 2)).toBe("<!DOCTYPE html>\n<body>\n</body></html>");
  });
});

// ── beatsFormValidDoc ────────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validBeats = [
    beat("<!DOCTYPE html><html><head></head>"),
    beat("<body>hello</body></html>"),
  ];

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc(validBeats)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body>hi</body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><body>")])).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html></html>")])).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

// ── cleanGeneratedHtml ───────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips leading ```html fence and trailing ```", () => {
    const input = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("strips ``` (no language label) fences", () => {
    const input = "```\n<!DOCTYPE html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles null/undefined safely", () => {
    // @ts-expect-error - testing runtime safety
    expect(cleanGeneratedHtml(null)).toBe("");
    // @ts-expect-error
    expect(cleanGeneratedHtml(undefined)).toBe("");
  });
});

// ── applyEdits ───────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies only the FIRST occurrence of the search string", () => {
    const { code, applied } = applyEdits("aa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("ba");
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

  it("counts only successfully applied edits", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "x", replace: "X" }, // no match
      { find: "a", replace: "Z" }, // match
    ]);
    expect(code).toBe("Zbc");
    expect(applied).toBe(1);
  });

  it("returns applied=0 when no edits match", () => {
    const { code, applied } = applyEdits("abc", [{ find: "xyz", replace: "ZZZ" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "X" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("handles an empty edits array", () => {
    const { code, applied } = applyEdits("abc", []);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("handles null/malformed edit entries gracefully", () => {
    // @ts-expect-error - testing runtime safety
    const { code, applied } = applyEdits("abc", [null, { find: "a", replace: "Z" }]);
    expect(code).toBe("Zbc");
    expect(applied).toBe(1);
  });
});
