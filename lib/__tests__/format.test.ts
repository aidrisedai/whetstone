import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  uid,
} from "../format";
import type { CodeBeat } from "../types";

const beat = (code: string, lang: CodeBeat["lang"] = "html"): CodeBeat => ({
  label: "test",
  code,
  say: "...",
  lang,
  isNew: true,
});

describe("assembleBeats", () => {
  it("concatenates beat code in order", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes beats 0 through index inclusive", () => {
    const beats = [beat("A"), beat("B"), beat("C"), beat("D")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });

  it("includes only first beat at index 0", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("X");
  });

  it("returns all beats at last index", () => {
    const beats = [beat("1"), beat("2"), beat("3")];
    expect(assembleBeatsUpTo(beats, 2)).toBe("123");
  });
});

describe("uid", () => {
  it("produces a string containing the prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });

  it("produces unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid("x")));
    expect(ids.size).toBe(100);
  });

  it("uses 'm' as the default prefix", () => {
    expect(uid()).toMatch(/^m_/);
  });
});
