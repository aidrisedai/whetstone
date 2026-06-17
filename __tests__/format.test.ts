import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string, isNew = true): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "say",
  isNew,
});

describe("assembleBeats", () => {
  it("concatenates all beat code in order", () => {
    const beats = [beat("<!DOCTYPE html>\n"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<!DOCTYPE html>\n<body></body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("concatenates beats 0 through index (inclusive)", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const html = `<!DOCTYPE html><html><head></head><body>hello</body></html>`;

  it("returns true for a complete HTML document assembled from beats", () => {
    const beats = [beat(html)];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("returns false for incomplete HTML", () => {
    expect(beatsFormValidDoc([beat("<div>hello</div>")])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("applyEdits", () => {
  const code = `<html>\n<body>\nhello world\n</body>\n</html>`;

  it("applies a find-and-replace edit", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "hello world", replace: "goodbye world" }]);
    expect(out).toContain("goodbye world");
    expect(applied).toBe(1);
  });

  it("replaces only the first occurrence", () => {
    const src = "aaa aaa";
    const { code: out } = applyEdits(src, [{ find: "aaa", replace: "bbb" }]);
    expect(out).toBe("bbb aaa");
  });

  it("returns 0 applied when find is not found", () => {
    const { applied } = applyEdits(code, [{ find: "not-present", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { applied } = applyEdits(code, [{ find: "", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in order", () => {
    const src = "A B C";
    const { code: out, applied } = applyEdits(src, [
      { find: "A", replace: "1" },
      { find: "B", replace: "2" },
    ]);
    expect(out).toBe("1 2 C");
    expect(applied).toBe(2);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips markdown code fences", () => {
    const fenced = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("leaves clean HTML untouched", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <div>hi</div>  ")).toBe("<div>hi</div>");
  });
});
