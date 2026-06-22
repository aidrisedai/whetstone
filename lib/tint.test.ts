import { describe, expect, it } from "vitest";
import { tint } from "./tint";

describe("tint", () => {
  it("HTML-escapes < > & before adding spans", () => {
    const result = tint("<div>&amp;</div>");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).toContain("&amp;amp;");
  });

  it("wraps JS keywords in tk-kw spans", () => {
    expect(tint("const x = 1")).toContain('<span class="tk-kw">const</span>');
    expect(tint("return value")).toContain('<span class="tk-kw">return</span>');
  });

  it("wraps string literals in tk-str spans", () => {
    expect(tint('"hello"')).toContain('<span class="tk-str">');
  });

  it("wraps HTML tags in tk-tag spans after escaping", () => {
    const result = tint("<div>");
    expect(result).toContain('<span class="tk-tag">div</span>');
  });

  it("does not produce raw < or > for HTML input", () => {
    const result = tint("<script>alert(1)</script>");
    expect(result).not.toMatch(/<script>/);
  });

  it("handles empty string", () => {
    expect(tint("")).toBe("");
  });
});
