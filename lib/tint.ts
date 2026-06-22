/** Dependency-free syntax tint for HTML/CSS/JS code snippets. HTML-escapes first. */
export function tint(code: string): string {
  let h = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  h = h.replace(/(&quot;|&#39;|"|')(.*?)\1/g, '<span class="tk-str">$1$2$1</span>');
  h = h.replace(
    /\b(const|let|var|function|return|for|forEach|map|filter|if|else|new|document|localStorage|addEventListener|try|catch|JSON)\b/g,
    '<span class="tk-kw">$1</span>',
  );
  h = h.replace(/(&lt;\/?)([a-zA-Z0-9]+)/g, '$1<span class="tk-tag">$2</span>');
  return h;
}
