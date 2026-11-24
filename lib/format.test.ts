import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  applyEdits,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  cleanGeneratedHtml,
  isSupportedImage,
  previewDoc,
  splitInlineCode,
  stripInlineCode,
} from "./format";
import type { CodeBeat } from "./types";

function beat(code: string, overrides: Partial<CodeBeat> = {}): CodeBeat {
  return { label: "beat", lang: "html", code, say: "", isNew: true, ...overrides };
}

describe("assembleBeats / assembleBeatsUpTo", () => {
  const beats = [beat("<a>\n"), beat("<b>\n"), beat("<c>\n")];

  it("concatenates all beats in order", () => {
    expect(assembleBeats(beats)).toBe("<a>\n<b>\n<c>\n");
  });

  it("concatenates only up to and including the given index", () => {
    expect(assembleBeatsUpTo(beats, 1)).toBe("<a>\n<b>\n");
    expect(assembleBeatsUpTo(beats, 0)).toBe("<a>\n");
  });

  it("ends each beat's last line so beats cannot fuse", () => {
    const fused = [beat("const a = 1; // first"), beat("const b = 2"), beat("")];
    expect(assembleBeats(fused)).toBe("const a = 1; // first\nconst b = 2\n");
    expect(assembleBeatsUpTo(fused, 0)).toBe("const a = 1; // first\n");
  });
});

describe("beatsFormValidDoc", () => {
  it("accepts a well-formed HTML document split across beats", () => {
    const beats = [
      beat("<!DOCTYPE html><html><head></head><body>"),
      beat("<h1>Hi</h1>"),
      beat("</body></html>"),
    ];
    expect(beatsFormValidDoc(beats)).toBe(true);
  });

  it("rejects a doc missing the doctype", () => {
    const beats = [beat("<html><body>hi</body></html>")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("rejects a doc that never closes </html>", () => {
    const beats = [beat("<!DOCTYPE html><html><body>hi")];
    expect(beatsFormValidDoc(beats)).toBe(false);
  });

  it("rejects an empty beat list", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips a leading/trailing markdown code fence", () => {
    expect(cleanGeneratedHtml("```html\n<p>hi</p>\n```")).toBe("<p>hi</p>");
  });

  it("leaves plain HTML untouched", () => {
    expect(cleanGeneratedHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("handles null/undefined input", () => {
    expect(cleanGeneratedHtml(undefined as unknown as string)).toBe("");
  });
});

describe("applyEdits", () => {
  it("applies each edit at the first exact match, in order", () => {
    const result = applyEdits("hello world", [
      { find: "hello", replace: "goodbye" },
      { find: "world", replace: "earth" },
    ]);
    expect(result.code).toBe("goodbye earth");
    expect(result.applied).toBe(2);
  });

  it("skips edits whose find text isn't present", () => {
    const result = applyEdits("hello world", [{ find: "missing", replace: "x" }]);
    expect(result.code).toBe("hello world");
    expect(result.applied).toBe(0);
  });

  it("skips malformed edit entries without throwing", () => {
    const result = applyEdits("hello", [
      { find: "", replace: "x" },
      null as unknown as { find: string; replace: string },
    ]);
    expect(result.applied).toBe(0);
    expect(result.code).toBe("hello");
  });
});

describe("isSupportedImage", () => {
  it("caps the file so its base64 form stays within the 5 MB vision limit", () => {
    expect(Math.ceil(MAX_IMAGE_BYTES / 3) * 4).toBeLessThanOrEqual(5 * 1024 * 1024);
    expect(isSupportedImage("image/png", MAX_IMAGE_BYTES)).toBe(true);
    expect(isSupportedImage("image/png", 4.5 * 1024 * 1024)).toBe(false);
  });
});

describe("previewDoc", () => {
  it("adds the storage stand-in inside <head>, keeping the doctype first", () => {
    const doc = previewDoc("<!DOCTYPE html><html><head><title>t</title></head><body></body></html>");
    expect(doc.startsWith("<!DOCTYPE html><html><head><script>")).toBe(true);
    expect(doc).toContain("<title>t</title>");
  });

  it("still adds it to a half-written document", () => {
    expect(previewDoc("<!DOCTYPE html>\n<body><h1>Hi").startsWith("<!DOCTYPE html><script>")).toBe(true);
    expect(previewDoc("<h1>Hi</h1>").startsWith("<script>")).toBe(true);
  });

  it("leaves an empty document empty", () => {
    expect(previewDoc("")).toBe("");
  });
});

describe("splitInlineCode", () => {
  it("separates backtick spans from the prose around them", () => {
    expect(splitInlineCode("A `<form>` collects `input`.")).toEqual([
      { text: "A ", code: false },
      { text: "<form>", code: true },
      { text: " collects ", code: false },
      { text: "input", code: true },
      { text: ".", code: false },
    ]);
  });

  it("leaves plain text and an unmatched backtick alone", () => {
    expect(splitInlineCode("no code here")).toEqual([{ text: "no code here", code: false }]);
    expect(splitInlineCode("a ` stray tick")).toEqual([{ text: "a ` stray tick", code: false }]);
    expect(splitInlineCode("")).toEqual([]);
  });

  it("gives the voice the same words without the backticks", () => {
    expect(stripInlineCode("Call `render()` again")).toBe("Call render() again");
  });
});
