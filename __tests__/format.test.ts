import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

function beat(code: string, isNew = true): CodeBeat {
  return { label: "test", lang: "html", code, say: "", isNew };
}

const VALID_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Test</title></head>
<body><h1>Hello</h1></body>
</html>`;

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles beats from 0 up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C"), beat("D")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns first beat for index 0", () => {
    expect(assembleBeatsUpTo([beat("A"), beat("B")], 0)).toBe("A");
  });

  it("includes all beats for the last index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  it("returns true for a well-formed HTML document split across beats", () => {
    const [head, ...rest] = VALID_HTML.split("\n");
    const beats = [beat(head + "\n"), beat(rest.join("\n"))];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("returns true for a single beat containing a valid doc", () => {
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true);
  });

  it("returns false when DOCTYPE is missing", () => {
    const noDoctype = `<html><head><title>X</title></head><body></body></html>`;
    expect(beatsFormValidDoc([beat(noDoctype)])).toBe(false);
  });

  it("returns false when </html> is missing", () => {
    const noClose = `<!DOCTYPE html><html><head></head><body>`;
    expect(beatsFormValidDoc([beat(noClose)])).toBe(false);
  });

  it("returns false when <body is missing", () => {
    const noBody = `<!DOCTYPE html><html><head></head></html>`;
    expect(beatsFormValidDoc([beat(noBody)])).toBe(false);
  });

  it("returns false for empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "world", replace: "earth" }]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies edits sequentially, each on the current (modified) code", () => {
    const { code, applied } = applyEdits("aaa", [
      { find: "aaa", replace: "bbb" },
      { find: "bbb", replace: "ccc" },
    ]);
    expect(code).toBe("ccc");
    expect(applied).toBe(2);
  });

  it("skips an edit when the `find` string is not present", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "missing", replace: "x" }]);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence", () => {
    const { code } = applyEdits("ab ab ab", [{ find: "ab", replace: "XY" }]);
    expect(code).toBe("XY ab ab");
  });

  it("skips edits with empty find strings", () => {
    const { code, applied } = applyEdits("hello", [{ find: "", replace: "x" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns 0 applied for an empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips a markdown html code fence", () => {
    const fenced = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("strips a plain ``` fence with no language tag", () => {
    const fenced = "```\n<p>hi</p>\n```";
    expect(cleanGeneratedHtml(fenced)).toBe("<p>hi</p>");
  });

  it("passes through content that is already plain HTML", () => {
    expect(cleanGeneratedHtml("<!DOCTYPE html>")).toBe("<!DOCTYPE html>");
  });

  it("trims surrounding whitespace", () => {
    expect(cleanGeneratedHtml("  <p>hi</p>  ")).toBe("<p>hi</p>");
  });

  it("handles empty string", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});
