import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  applyEdits,
} from "../lib/format";
import type { CodeBeat } from "../lib/types";

function beat(label: string, lang: CodeBeat["lang"], code: string): CodeBeat {
  return { label, lang, code, say: "narration", isNew: true };
}

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(0);
  });

  it("generates unique values", () => {
    expect(uid()).not.toBe(uid());
  });

  it("uses the given prefix", () => {
    expect(uid("x").startsWith("x_")).toBe(true);
  });
});

describe("assembleBeats", () => {
  it("joins code chunks in order", () => {
    const beats: CodeBeat[] = [beat("a", "html", "<h1>"), beat("b", "html", "</h1>")];
    expect(assembleBeats(beats)).toBe("<h1></h1>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles only up to the given index", () => {
    const beats: CodeBeat[] = [
      beat("a", "html", "A"),
      beat("b", "html", "B"),
      beat("c", "html", "C"),
    ];
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml =
    "<!DOCTYPE html><html><head></head><body><p>Hello</p></body></html>";

  it("accepts a valid HTML document", () => {
    const beats: CodeBeat[] = [beat("all", "html", validHtml)];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("rejects empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("rejects a fragment missing DOCTYPE", () => {
    const beats: CodeBeat[] = [beat("frag", "html", "<html><body></body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("rejects a document missing closing html tag", () => {
    const beats: CodeBeat[] = [beat("open", "html", "<!DOCTYPE html><html><body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading and trailing code fences", () => {
    expect(cleanGeneratedHtml("```html\n<b>hi</b>\n```")).toBe("<b>hi</b>");
  });

  it("strips plain triple-backtick fences", () => {
    expect(cleanGeneratedHtml("```\n<p>test</p>\n```")).toBe("<p>test</p>");
  });

  it("returns passthrough for clean HTML", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles null-like input gracefully", () => {
    expect(cleanGeneratedHtml("")).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits("hello world", [
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe("hello earth");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits("A B C", [
      { find: "A", replace: "1" },
      { find: "B", replace: "2" },
    ]);
    expect(code).toBe("1 2 C");
    expect(applied).toBe(2);
  });

  it("skips edits where find is not present", () => {
    const { code, applied } = applyEdits("abc", [{ find: "xyz", replace: "!" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("skips edits with empty find string", () => {
    const { code, applied } = applyEdits("abc", [{ find: "", replace: "!" }]);
    expect(code).toBe("abc");
    expect(applied).toBe(0);
  });

  it("only replaces the first match", () => {
    const { code, applied } = applyEdits("aa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("ba");
    expect(applied).toBe(1);
  });
});
