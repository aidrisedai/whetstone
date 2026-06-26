import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

function beat(label: string, code: string): CodeBeat {
  return { label, code, lang: "html", say: "", isNew: false };
}

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("A", "hello "), beat("B", "world")];
    expect(assembleBeats(beats)).toBe("hello world");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0..index inclusive", () => {
    const beats = [beat("A", "a"), beat("B", "b"), beat("C", "c")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });

  it("returns single beat at index 0", () => {
    const beats = [beat("A", "only")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("only");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;

  it("returns true for a valid HTML document split across beats", () => {
    const beats = [beat("start", validHtml.slice(0, 30)), beat("end", validHtml.slice(30))];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    const beats = [beat("a", "<html><body>hi</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when </html> closing tag is missing", () => {
    const beats = [beat("a", "<!DOCTYPE html><html><body>hi</body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when <body> is missing", () => {
    const beats = [beat("a", "<!DOCTYPE html><html></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const input = "```html\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hello</p>");
  });

  it("strips plain code fences", () => {
    const input = "```\n<p>hello</p>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<p>hello</p>");
  });

  it("leaves clean HTML untouched", () => {
    const input = "<p>hello</p>";
    expect(cleanGeneratedHtml(input)).toBe("<p>hello</p>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  const base = "<html><body><h1>Title</h1><p>Text</p></body></html>";

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "<h1>Title</h1>", replace: "<h1>New Title</h1>" }]);
    expect(applied).toBe(1);
    expect(code).toContain("<h1>New Title</h1>");
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Title", replace: "H1" },
      { find: "Text", replace: "P" },
    ]);
    expect(applied).toBe(2);
    expect(code).toContain("H1");
    expect(code).toContain("P");
  });

  it("skips edits where find string is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "MISSING", replace: "x" }]);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });

  it("skips null/malformed edit entries", () => {
    const { code, applied } = applyEdits(base, [null as unknown as { find: string; replace: string }]);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(applied).toBe(1);
    expect(code).toBe("baa");
  });

  it("returns zero applied and original code for empty edits list", () => {
    const { code, applied } = applyEdits(base, []);
    expect(applied).toBe(0);
    expect(code).toBe(base);
  });
});
