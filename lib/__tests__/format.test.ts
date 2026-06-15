import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "../format";
import type { CodeBeat } from "../types";

// ── uid ────────────────────────────────────────────────────────────────────

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(uid()).toBeTruthy();
  });

  it("includes the given prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });

  it("generates unique IDs on successive calls", () => {
    const a = uid("x");
    const b = uid("x");
    expect(a).not.toBe(b);
  });
});

// ── assembleBeats / assembleBeatsUpTo ──────────────────────────────────────

function beat(code: string): CodeBeat {
  return { label: "lbl", lang: "html", code, say: "", isNew: true };
}

describe("assembleBeats", () => {
  it("concatenates all beats in order", () => {
    expect(assembleBeats([beat("a"), beat("b"), beat("c")])).toBe("abc");
  });

  it("returns an empty string for an empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("assembles only beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("includes the full file when index is the last beat", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("XY");
  });
});

// ── beatsFormValidDoc ──────────────────────────────────────────────────────

const MINIMAL_HTML = `<!DOCTYPE html><html><head></head><body></body></html>`;

describe("beatsFormValidDoc", () => {
  it("accepts a valid HTML document", () => {
    expect(beatsFormValidDoc([beat(MINIMAL_HTML)])).toBe(true);
  });

  it("rejects an empty beats array", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("rejects a document missing DOCTYPE", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("rejects a document missing </html>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("rejects a document missing <body>", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false);
  });
});

// ── applyEdits ────────────────────────────────────────────────────────────

describe("applyEdits", () => {
  const base = `<html><body>Hello world</body></html>`;

  it("applies a single find-and-replace edit", () => {
    const { code, applied } = applyEdits(base, [{ find: "Hello world", replace: "Hi there" }]);
    expect(code).toBe(`<html><body>Hi there</body></html>`);
    expect(applied).toBe(1);
  });

  it("applies multiple edits in order", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hey" },
      { find: "world", replace: "earth" },
    ]);
    expect(code).toBe(`<html><body>Hey earth</body></html>`);
    expect(applied).toBe(2);
  });

  it("skips edits where find is not found", () => {
    const { code, applied } = applyEdits(base, [{ find: "MISSING", replace: "nope" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("skips edits with an empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "bad" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("applies the first occurrence only (no global replace)", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });

  it("handles an empty edits array gracefully", () => {
    const { code, applied } = applyEdits(base, []);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });
});

// ── cleanGeneratedHtml ────────────────────────────────────────────────────

describe("cleanGeneratedHtml", () => {
  it("strips markdown html fences", () => {
    const wrapped = "```html\n<!DOCTYPE html><html></html>\n```";
    expect(cleanGeneratedHtml(wrapped)).toBe("<!DOCTYPE html><html></html>");
  });

  it("strips plain backtick fences", () => {
    const wrapped = "```\nhello\n```";
    expect(cleanGeneratedHtml(wrapped)).toBe("hello");
  });

  it("returns plain HTML unchanged (after trim)", () => {
    const plain = "  <!DOCTYPE html><html></html>  ";
    expect(cleanGeneratedHtml(plain)).toBe("<!DOCTYPE html><html></html>");
  });

  it("handles empty input", () => {
    expect(cleanGeneratedHtml("")).toBe("");
    // @ts-expect-error — test runtime safety against undefined
    expect(cleanGeneratedHtml(undefined)).toBe("");
  });
});
