import { describe, expect, it } from "vitest";
import {
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "narration",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates code strings in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("x"), beat("y"), beat("z")];

  it("returns only the first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("x");
  });

  it("returns first two beats at index 1", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("xy");
  });

  it("returns all beats at last index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("xyz");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = `<!DOCTYPE html>
<html><head><title>T</title></head>
<body><p>Hello</p></body>
</html>`;

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const html = "<html><body>hi</body></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    const html = "<!DOCTYPE html><html><body>hi</body>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(beatsFormValidDoc([beat(html)])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing markdown fences", () => {
    expect(cleanGeneratedHtml("```html\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });

  it("strips generic triple-backtick fences", () => {
    expect(cleanGeneratedHtml("```\n<div>hi</div>\n```")).toBe("<div>hi</div>");
  });

  it("passes through plain HTML unchanged", () => {
    expect(cleanGeneratedHtml("<div>hi</div>")).toBe("<div>hi</div>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("replaces the first occurrence of a find string", () => {
    const { code, applied } = applyEdits("aXbXc", [{ find: "X", replace: "Y" }]);
    expect(code).toBe("aYbXc");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "A" },
      { find: "c", replace: "C" },
    ]);
    expect(code).toBe("AbC");
    expect(applied).toBe(2);
  });

  it("skips edits where find string is not present", () => {
    const { code, applied } = applyEdits("abc", [{ find: "z", replace: "Z" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "X" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("handles empty edits array", () => {
    const { code, applied } = applyEdits("abc", []);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });
});
