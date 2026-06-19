import { describe, it, expect } from "vitest";
import {
  uid,
  assembleBeats,
  assembleBeatsUpTo,
  beatsFormValidDoc,
  applyEdits,
  cleanGeneratedHtml,
} from "@/lib/format";
import type { CodeBeat } from "@/lib/types";

const beat = (code: string): CodeBeat => ({
  label: "test",
  lang: "html",
  code,
  say: "say",
  isNew: true,
});

describe("uid", () => {
  it("generates a string id", () => expect(typeof uid()).toBe("string"));
  it("includes the prefix", () => expect(uid("msg").startsWith("msg_")).toBe(true));
  it("generates unique values", () => expect(uid()).not.toBe(uid()));
});

describe("assembleBeats", () => {
  it("concatenates code in order", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeats(beats)).toBe("ABC");
  });
  it("returns empty string for no beats", () => expect(assembleBeats([])).toBe(""));
});

describe("assembleBeatsUpTo", () => {
  it("includes beats up to and including the given index", () => {
    const beats = [beat("A"), beat("B"), beat("C")];
    expect(assembleBeatsUpTo(beats, 1)).toBe("AB");
  });
  it("returns single beat at index 0", () => {
    expect(assembleBeatsUpTo([beat("X")], 0)).toBe("X");
  });
});

const VALID_HTML = `<!DOCTYPE html>
<html lang="en">
<head><title>T</title></head>
<body><p>hi</p></body>
</html>`;

describe("beatsFormValidDoc", () => {
  it("returns true for a valid complete HTML file", () => {
    expect(beatsFormValidDoc([beat(VALID_HTML)])).toBe(true);
  });

  it("returns false for missing DOCTYPE", () => {
    const bad = VALID_HTML.replace("<!DOCTYPE html>", "");
    expect(beatsFormValidDoc([beat(bad)])).toBe(false);
  });

  it("returns false for missing </html>", () => {
    const bad = VALID_HTML.replace("</html>", "");
    expect(beatsFormValidDoc([beat(bad)])).toBe(false);
  });

  it("returns false for missing <body", () => {
    const bad = VALID_HTML.replace("<body>", "").replace("</body>", "");
    expect(beatsFormValidDoc([beat(bad)])).toBe(false);
  });

  it("returns false for empty beats", () => {
    expect(beatsFormValidDoc([])).toBe(false);
  });
});

describe("applyEdits", () => {
  const code = `<html><body>Hello World</body></html>`;

  it("replaces the first match", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello World", replace: "Goodbye World" },
    ]);
    expect(out).toBe("<html><body>Goodbye World</body></html>");
    expect(applied).toBe(1);
  });

  it("applies multiple edits in sequence", () => {
    const { code: out, applied } = applyEdits(code, [
      { find: "Hello", replace: "Hi" },
      { find: "World", replace: "Earth" },
    ]);
    expect(out).toBe("<html><body>Hi Earth</body></html>");
    expect(applied).toBe(2);
  });

  it("reports 0 applied when no match", () => {
    const { applied } = applyEdits(code, [{ find: "NOTFOUND", replace: "x" }]);
    expect(applied).toBe(0);
  });

  it("skips edits with empty find strings", () => {
    const { code: out, applied } = applyEdits(code, [{ find: "", replace: "oops" }]);
    expect(out).toBe(code);
    expect(applied).toBe(0);
  });
});

describe("cleanGeneratedHtml", () => {
  it("strips leading/trailing code fences", () => {
    const raw = "```html\n<!DOCTYPE html>\n<html></html>\n```";
    expect(cleanGeneratedHtml(raw)).toBe("<!DOCTYPE html>\n<html></html>");
  });

  it("passes through plain HTML unchanged", () => {
    const html = "<!DOCTYPE html><html></html>";
    expect(cleanGeneratedHtml(html)).toBe(html);
  });

  it("handles empty string", () => expect(cleanGeneratedHtml("")).toBe(""));
});
