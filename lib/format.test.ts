import { describe, expect, it } from "vitest";
import { applyEdits, assembleBeats, assembleBeatsUpTo, beatsFormValidDoc, cleanGeneratedHtml, uid } from "./format";
import type { CodeBeat } from "./types";

describe("uid", () => {
  it("produces unique, prefixed ids", () => {
    const a = uid("m");
    const b = uid("m");
    expect(a).not.toBe(b);
    expect(a.startsWith("m_")).toBe(true);
  });
});

describe("assembleBeats / assembleBeatsUpTo", () => {
  const beats: CodeBeat[] = [
    { code: "<a>" } as CodeBeat,
    { code: "<b>" } as CodeBeat,
    { code: "<c>" } as CodeBeat,
  ];

  it("joins all beats in order", () => {
    expect(assembleBeats(beats)).toBe("<a><b><c>");
  });

  it("joins only beats up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("<a><b>");
    expect(assembleBeatsUpTo(beats, 0)).toBe("<a>");
  });
});

describe("beatsFormValidDoc", () => {
  it("accepts a well-formed html document split across beats", () => {
    const beats: CodeBeat[] = [
      { code: "<!DOCTYPE html><html><body>" } as CodeBeat,
      { code: "<h1>hi</h1></body></html>" } as CodeBeat,
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("rejects an empty beat list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("rejects a doc missing the doctype", () => {
    const beats: CodeBeat[] = [{ code: "<html><body>hi</body></html>" } as CodeBeat];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("rejects a doc missing a body tag", () => {
    const beats: CodeBeat[] = [{ code: "<!DOCTYPE html><html></html>" } as CodeBeat];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("rejects a doc that doesn't end with </html>", () => {
    const beats: CodeBeat[] = [{ code: "<!DOCTYPE html><html><body>hi</body></html><!-- oops -->" } as CodeBeat];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips a leading/trailing markdown code fence", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves plain html untouched", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles nullish input", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies each edit to the first exact match, in order", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "hello", replace: "goodbye" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("goodbye earth");
    expect(applied).toBe(2);
  });

  it("skips edits whose find text isn't present", () => {
    const { code, applied } = applyEdits("hello world", [{ find: "nope", replace: "x" }]);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("skips malformed edit entries", () => {
    const edits = [{ find: "", replace: "x" }, { find: "hello" }] as { find: string; replace: string }[];
    const { code, applied } = applyEdits("hello world", edits);
    expect(code).toBe("hello world");
    expect(applied).toBe(0);
  });

  it("only replaces the first occurrence of a repeated match", () => {
    const { code, applied } = applyEdits("a a a", [{ find: "a", replace: "b" }]);
    expect(code).toBe("b a a");
    expect(applied).toBe(1);
  });
});
