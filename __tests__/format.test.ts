import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  lang,
  code,
  say: "test say",
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    expect(assembleBeats([beat("<a>"), beat("<b>")])).toBe("<a><b>");
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];
  it("includes only beats up to the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
  it("includes all beats at last index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
  it("returns single beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml = "<!DOCTYPE html><html><head></head><body><p>hi</p></body></html>";

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validHtml)])).toBe(true);
  });

  it("returns false for an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("applies a single edit", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("a b c", [
      { find: "a", replace: "X" },
      { find: "c", replace: "Z" },
    ]);
    expect(code).toBe("X b Z");
    expect(applied).toBe(2);
  });

  it("reports 0 applied when no edit matches", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    const input = "```html\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("strips plain code fences without language tag", () => {
    const input = "```\n<div>hi</div>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<div>hi</div>");
  });

  it("returns clean HTML untouched", () => {
    const input = "<div>hi</div>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
