import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({ code, label: "", lang: "html", say: "", isNew: false });

describe("assembleBeats", () => {
  it("joins all beats in order", () => {
    expect(assembleBeats([beat("<html>"), beat("<body>"), beat("</body></html>")])).toBe(
      "<html><body></body></html>",
    );
  });
  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("a"), beat("b"), beat("c")];

  it("includes beats 0..index inclusive", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("ab");
  });
  it("includes all beats at last index", () => {
    expect(assembleBeatsUpTo(beats, 2)).toBe("abc");
  });
  it("returns just first beat at index 0", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("a");
  });
});

describe("beatsFormValidDoc", () => {
  const validDoc = `<!DOCTYPE html>\n<html><head></head><body><p>hi</p></body></html>`;

  it("returns true for a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(validDoc)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false if DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false if </html> closing tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false);
  });

  it("returns false if <body> is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences with language tag", () => {
    expect(cleanGeneratedHtml("```html\n<h1>hi</h1>\n```")).toBe("<h1>hi</h1>");
  });

  it("strips plain fences without language tag", () => {
    expect(cleanGeneratedHtml("```\n<p>test</p>\n```")).toBe("<p>test</p>");
  });

  it("leaves unfenced content unchanged", () => {
    expect(cleanGeneratedHtml("<div>hello</div>")).toBe("<div>hello</div>");
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-replace edit", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "there" }]);
    expect(code).toBe("hello there");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("aXbXc", [
      { find: "a", replace: "1" },
      { find: "c", replace: "3" },
    ]);
    expect(code).toBe("1XbX3");
    expect(applied).toBe(2);
  });

  it("only replaces the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
    expect(applied).toBe(1);
  });

  it("counts 0 applied when find target is absent", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "X" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles an empty edit list", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});
