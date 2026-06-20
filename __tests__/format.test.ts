import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({ label: "l", lang: "html", code, say: "s", isNew: true });

const validHtmlBeats: CodeBeat[] = [
  beat("<!DOCTYPE html>\n<html lang=\"en\">\n<head></head>\n"),
  beat("<body>\n<p>Hello</p>\n</body>\n</html>"),
];

describe("uid", () => {
  it("uses the supplied prefix", () => expect(uid("x")).toMatch(/^x_/));
  it("uses 'm' as the default prefix", () => expect(uid()).toMatch(/^m_/));
  it("generates unique values", () => {
    const ids = Array.from({ length: 20 }, () => uid("t"));
    expect(new Set(ids).size).toBe(20);
  });
});

describe("assembleBeats", () => {
  it("concatenates all beat codes in order", () => {
    const beats = [beat("a"), beat("b"), beat("c")];
    expect(assembleBeats(beats)).toBe("abc");
  });
  it("returns empty string for an empty array", () => expect(assembleBeats([])).toBe(""));
  it("returns the single code for one beat", () => expect(assembleBeats([beat("x")])).toBe("x"));
});

describe("assembleBeatsUpTo", () => {
  const beats = [beat("A"), beat("B"), beat("C")];

  it("returns only beat 0 at index 0", () => expect(assembleBeatsUpTo(beats, 0)).toBe("A"));
  it("returns beats 0..1 at index 1", () => expect(assembleBeatsUpTo(beats, 1)).toBe("AB"));
  it("returns all beats at the last index", () => expect(assembleBeatsUpTo(beats, 2)).toBe("ABC"));
  it("returns everything when index exceeds length (slice behaviour)", () =>
    expect(assembleBeatsUpTo(beats, 99)).toBe("ABC"));
});

describe("beatsFormValidDoc", () => {
  it("returns true for a complete HTML document", () =>
    expect(beatsFormValidDoc(validHtmlBeats)).toBe(true));
  it("returns false for an empty beats array", () =>
    expect(beatsFormValidDoc([])).toBe(false));
  it("returns false when there is no <!DOCTYPE html> header", () =>
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false));
  it("returns false when there is no <body> tag", () =>
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html></html>")])).toBe(false));
  it("returns false when the document is not closed with </html>", () =>
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body></body>")])).toBe(false));
  it("is case-insensitive for the DOCTYPE declaration", () =>
    expect(beatsFormValidDoc([beat("<!doctype html><html><body></body></html>")])).toBe(true));
});

describe("applyEdits", () => {
  const base = "Hello world, this is a test.";

  it("applies a single find-and-replace", () => {
    const { code, applied } = applyEdits(base, [{ find: "world", replace: "there" }]);
    expect(code).toBe("Hello there, this is a test.");
    expect(applied).toBe(1);
  });

  it("returns applied=0 when the find string is not present", () => {
    const { code, applied } = applyEdits(base, [{ find: "missing", replace: "x" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("applies multiple edits in sequence", () => {
    const { code, applied } = applyEdits(base, [
      { find: "Hello", replace: "Hi" },
      { find: "test", replace: "demo" },
    ]);
    expect(code).toBe("Hi world, this is a demo.");
    expect(applied).toBe(2);
  });

  it("skips an edit with an empty find string", () => {
    const { code, applied } = applyEdits(base, [{ find: "", replace: "oops" }]);
    expect(code).toBe(base);
    expect(applied).toBe(0);
  });

  it("replaces only the first occurrence", () => {
    const { code } = applyEdits("aaa", [{ find: "a", replace: "b" }]);
    expect(code).toBe("baa");
  });
});
