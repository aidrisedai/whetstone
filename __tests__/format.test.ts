import { describe, it, expect } from "vitest";
import {
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  uid,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({
  code,
  label: "step",
  lang: "html",
  say: "",
  isNew: false,
});

describe("assembleBeats", () => {
  it("concatenates all beat code", () => {
    const beats = [beat("<html>"), beat("<body>"), beat("</body></html>")];
    expect(assembleBeats(beats)).toBe("<html><body></body></html>");
  });

  it("returns empty string for empty array", () => {
    expect(assembleBeats([])).toBe("");
  });
});

describe("assembleBeatsUpTo", () => {
  it("includes only beats up to and including the index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
    expect(assembleBeatsUpTo(beats, 2)).toBe("ABC");
  });

  it("returns first beat for index 0", () => {
    const beats = [beat("X"), beat("Y")];
    expect(assembleBeatsUpTo(beats, 0)).toBe("X");
  });
});

describe("beatsFormValidDoc", () => {
  const VALID_HTML =
    "<!DOCTYPE html><html><head></head><body>hello</body></html>";

  it("returns true for a complete HTML document", () => {
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });

  it("returns false when DOCTYPE is missing", () => {
    expect(beatsFormValidDoc([beat("<html><body></body></html>")])).toBe(false);
  });

  it("returns false when closing html tag is missing", () => {
    expect(beatsFormValidDoc([beat("<!DOCTYPE html><html><body>")])).toBe(false);
  });

  it("returns false when body tag is missing", () => {
    const noBody = "<!DOCTYPE html><html><head></head></html>";
    expect(beatsFormValidDoc([beat(noBody)])).toBe(false);
  });

  it("works across multiple beats", () => {
    const b1 = beat("<!DOCTYPE html><html><head></head>");
    const b2 = beat("<body>content</body>");
    const b3 = beat("</html>");
    expect(beatsFormValidDoc([b1, b2, b3])).toBe(true);
  });
});

describe("uid", () => {
  it("returns a string", () => {
    expect(typeof uid()).toBe("string");
  });

  it("is unique across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });

  it("uses the given prefix", () => {
    expect(uid("msg")).toMatch(/^msg_/);
  });

  it("defaults to 'm' prefix", () => {
    expect(uid()).toMatch(/^m_/);
  });
});
