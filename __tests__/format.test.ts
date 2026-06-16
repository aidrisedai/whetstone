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

const beat = (code: string, isNew = false): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "narration",
  isNew,
});

describe("uid", () => {
  it("includes the prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
    expect(uid("u")).toMatch(/^u_/);
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid("x")));
    expect(ids.size).toBe(100);
  });
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</html>")];
    expect(assembleBeats(beats)).toBe("<html><body></html>");
  });

  it("returns empty string for no beats", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("includes only beats up to the given index", () => {
    expect(assembleBeatsUpTo(beats, 0)).toBe("A");
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });
});

describe("beatsFormValidDoc", () => {
  const validHtml =
    "<!DOCTYPE html><html><head><title>T</title></head><body><p>hi</p></body></html>";

  it("returns true for a valid HTML document", () => {
    const beats = [beat(validHtml)];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("returns false for an empty list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    const beats = [beat("<html><body>hi</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("returns false when closing </html> is missing", () => {
    const beats = [beat("<!DOCTYPE html><html><body>hi</body>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips a markdown code fence", () => {
    const input = "```html\n<html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html>");
  });

  it("strips a plain ``` fence", () => {
    const input = "```\n<html>\n```";
    expect(cleanGeneratedHtml(input)).toBe("<html>");
  });

  it("leaves already-clean HTML untouched", () => {
    const input = "<html><body>hi</body></html>";
    expect(cleanGeneratedHtml(input)).toBe(input);
  });

  it("handles null/undefined gracefully", () => {
    expect(cleanGeneratedHtml(null as never)).toBe("");
    expect(cleanGeneratedHtml(undefined as never)).toBe("");
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

  it("applies edits in order", () => {
    const { code, applied } = applyEdits("abc", [
      { find: "a", replace: "A" },
      { find: "b", replace: "B" },
    ]);
    expect(code).toBe("ABc");
    expect(applied).toBe(2);
  });

  it("replaces only the first occurrence", () => {
    const { code, applied } = applyEdits("aaa", [{ find: "a", replace: "X" }]);
    expect(code).toBe("Xaa");
    expect(applied).toBe(1);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits("hello", [{ find: "xyz", replace: "abc" }]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("returns applied=0 for empty edits array", () => {
    const { code, applied } = applyEdits("hello", []);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("skips malformed edit entries", () => {
    const { code, applied } = applyEdits("hello", [
      { find: "", replace: "X" }, // empty find — should skip
      null as never,
    ]);
    expect(code).toBe("hello");
    expect(applied).toBe(0);
  });

  it("handles multi-line find-and-replace", () => {
    const original = "line1\nline2\nline3";
    const { code, applied } = applyEdits(original, [
      { find: "line1\nline2", replace: "replaced" },
    ]);
    expect(code).toBe("replaced\nline3");
    expect(applied).toBe(1);
  });
});
