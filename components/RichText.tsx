import { splitInlineCode } from "@/lib/format";

/** Teacher text with `backtick` spans shown as inline code. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {splitInlineCode(text).map((s, i) =>
        s.code ? (
          <code key={i} className="inline-code">
            {s.text}
          </code>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}
