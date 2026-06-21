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

function makeBeats(codes: string[]): CodeBeat[] {
  return codes.map((code, i) => ({
    label: `beat-${i}`,
    lang: "html" as const,
    code,
    say: "narration",
    isNew: true,
  }));
}

describe("uid", () => {
  it("returns a string", () => {
    expect(typeof uid()).toBe("string");
  });

  it("returns different values on successive calls", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it("uses the provided prefix", () => {
    const id = uid("test");
    expect(id.startsWith("test_")).toBe(true);
  });

  it("defaults to 'm' prefix", () => {
    const id = uid();
    expect(id.startsWith("m_")).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("concatenates code from all beats in order", () => {
    const beats = makeBeats(["<html>", "<body>", "</body></html>"]);
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns an empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });

  it("returns the single beat's code unchanged", () => {
    const beats = makeBeats(["hello"]);
    expect(assembleBeats(beats)).toBe("hello");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0 through index (inclusive)", () => {
    const beats = makeBeats(["A", "B", "C", "D"]);
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns only the first beat for index 0", () => {
    const beats = makeBeats(["X", "Y", "Z"]);
    expect(assembleBeatsUpTo(beats, 0)).toBe("X");
  });

  it("returns all beats when index is last", () => {
    const beats = makeBeats(["A", "B", "C"]);
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns empty string for empty beats array", () => {
    expect(assembleBeatsUpTo([], 0)).toBe("");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtmlBeats = makeBeats([
    '<!DOCTYPE html>\n<html lang="en">\n<head><title>Test</title></head>\n<body>\n<p>Hello</p>\n</body>\n</html>',
  ]);

  it("returns true for a complete valid HTML document", () => {
    expect(beatsFormValidDoc(validHtmlBeats)).toBe(true);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false for partial HTML (no closing tag)", () => {
    const partial = makeBeats(["<!DOCTYPE html>\n<html>\n<body>\n<p>Partial"]);
    expect(beatsFormValidDoc(partial)).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const noDoctype = makeBeats(["<html>\n<body>\n<p>No doctype</p>\n</body>\n</html>"]);
    expect(beatsFormValidDoc(noDoctype)).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    const noBody = makeBeats(["<!DOCTYPE html>\n<html>\n<head></head>\n</html>"]);
    expect(beatsFormValidDoc(noBody)).toBe(false);
  });

  it("works across multiple beats that together form a valid doc", () => {
    const multiBeats = makeBeats([
      "<!DOCTYPE html>\n<html>\n<head><title>T</title></head>\n<body>\n",
      "<p>Content</p>\n",
      "</body>\n</html>",
    ]);
    expect(beatsFormValidDoc(multiBeats)).toBe(true);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips opening ```html fence", () => {
    const result = cleanGeneratedHtml("```html\n<p>hello</p>\n```");
    expect(result).toBe("<p>hello</p>");
  });

  it("strips generic ``` fences", () => {
    const result = cleanGeneratedHtml("```\n<p>hello</p>\n```");
    expect(result).toBe("<p>hello</p>");
  });

  it("leaves already-clean text unchanged", () => {
    const html = "<p>already clean</p>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });

  it("handles null-ish input gracefully (via ?? coercion)", () => {
    // The function does `(text ?? "")` so undefined coerces to ""
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace edit", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "vitest" }]);
    expect(code).toBe("hello vitest");
    expect(applied).toBe(1);
  });

  it("applies edits on the first match only", () => {
    const { code, applied } = applyEdits("aaa bbb aaa", [{ find: "aaa", replace: "ccc" }]);
    expect(code).toBe("ccc bbb aaa");
    expect(applied).toBe(1);
  });

  it("skips edits where the find string is not present", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "missing", replace: "x" }]);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("skips edits with an empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("applies multiple edits sequentially", () => {
    const { code, applied } = applyEdits("foo bar baz", [
      { find: "foo", replace: "FOO" },
      { find: "baz", replace: "BAZ" },
    ]);
    expect(code).toBe("FOO bar BAZ");
    expect(applied).toBe(2);
  });

  it("returns applied=0 and original code for empty edits array", () => {
    const { code, applied } = applyEdits("unchanged", []);
    expect(code).toBe("unchanged");
    expect(applied).toBe(0);
  });

  it("handles null/malformed edit entries gracefully", () => {
    const { code, applied } = applyEdits("hello", [
      null as unknown as { find: string; replace: string },
      { find: "hello", replace: "world" },
    ]);
    expect(code).toBe("world");
    expect(applied).toBe(1);
  });
});
