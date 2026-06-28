import { describe, it, expect } from "vitest";
import { uid, applyEdits } from "../lib/format";

describe("uid", () => {
  it("returns a string", () => expect(typeof uid("x")).toBe("string"));
  it("includes the prefix", () => expect(uid("pfx").startsWith("pfx_")).toBe(true));
  it("generates unique ids", () => expect(uid("a")).not.toBe(uid("a")));
});

describe("applyEdits", () => {
  it("replaces an exact match", () => {
    const code = "function hello() { return 1; }";
    const result = applyEdits(code, [{ find: "return 1;", replace: "return 2;" }]);
    expect(result.code).toContain("return 2;");
    expect(result.applied).toBe(1);
  });

  it("counts 0 applied for edits that find nothing", () => {
    const code = "const x = 1;";
    const result = applyEdits(code, [{ find: "MISSING", replace: "x" }]);
    expect(result.applied).toBe(0);
  });

  it("applies multiple edits in sequence", () => {
    const code = "const a = 1;\nconst b = 2;";
    const result = applyEdits(code, [
      { find: "const a = 1;", replace: "const a = 10;" },
      { find: "const b = 2;", replace: "const b = 20;" },
    ]);
    expect(result.code).toContain("const a = 10;");
    expect(result.code).toContain("const b = 20;");
    expect(result.applied).toBe(2);
  });

  it("returns unchanged code when no edits match", () => {
    const code = "original";
    const result = applyEdits(code, [{ find: "not here", replace: "x" }]);
    expect(result.code).toBe("original");
  });
});
