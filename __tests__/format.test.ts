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

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

// ─── uid ─────────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(0);
  });

  it("uses the given prefix", () => {
    expect(uid("msg").startsWith("msg_")).toBe(true);
    expect(uid("q").startsWith("q_")).toBe(true);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => uid()));
    expect(ids.size).toBe(20);
  });
});

// ─── assembleBeats ────────────────────────────────────────────────────────────

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<!DOCTYPE html><html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html><html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

// ─── assembleBeatsUpTo ────────────────────────────────────────────────────────

describe("assembleBeatsUpTo", () => {
  it("assembles beats from start through the given index (inclusive)", () => {
    const beats = [beat("A"), beat("B"), beat("C"), beat("D")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns all beats when index equals length - 1", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("XY");
  });

  it("returns only first beat for index 0", () => {
    const beats = [beat("first"), beat("second")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("first");
  });
});

// ─── beatsFormValidDoc ───────────────────────────────────────────────────────

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

  it("returns true for a valid HTML document assembled from beats", () => {
    const beats = [beat(validHtml)];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const beats = [beat("<html><body></body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html><body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
});

// ─── cleanGeneratedHtml ───────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips ```html ... ``` code fences", () => {
    const input = "```html\n<!DOCTYPE html><html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<!DOCTYPE html><html></html>");
  });

  it("strips plain ``` fences", () => {
    const input = "```\n<html></html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html></html>");
  });

  it("leaves plain HTML untouched", () => {
    const input = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

// ─── applyEdits ───────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  it("applies a single find-replace and reports applied count", () => {
    const result = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(result.code).toBe("hello there");
    expect(result.applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const result = applyEdits("foo bar baz", [
      { find: "foo", replace: "FOO" },
      { find: "bar", replace: "BAR" },
    ]);
    expect(result.code).toBe("FOO BAR baz");
    expect(result.applied).toBe(2);
  });

  it("skips edits where the find string is not present", () => {
    const result = applyEdits("hello world", [{ find: "missing", replace: "x" }]);
    expect(result.code).toBe("hello world");
    expect(result.applied).toBe(0);
  });

  it("replaces only the first occurrence of find", () => {
    const result = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(result.code).toBe("baa");
  });

  it("skips edits with empty find strings", () => {
    const result = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(result.code).toBe("hello");
    expect(result.applied).toBe(0);
  });

  it("handles an empty edits array without modifying code", () => {
    const result = applyEdits("unchanged", []);
    expect(result.code).toBe("unchanged");
    expect(result.applied).toBe(0);
  });

  it("skips null/malformed edit entries", () => {
    const result = applyEdits("hello", [
      null as unknown as { find: string; replace: string },
      { find: "hello", replace: "goodbye" },
    ]);
    expect(result.code).toBe("goodbye");
    expect(result.applied).toBe(1);
  });
});
