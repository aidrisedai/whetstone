"use client";

import { useMemo } from "react";
import { splitInlineCode } from "@/lib/format";

/**
 * Live "karaoke" caption like the reference image: the words spoken so far are
 * dark/bold, the rest are greyed. `progress` is 0..1 through the line.
 * `backtick` code spans are shown as inline code, without the backticks.
 */
export function Caption({ text, progress }: { text: string; progress: number }) {
  const words = useMemo(
    () =>
      splitInlineCode(text).flatMap((seg) =>
        seg.text
          .split(/(\s+)/) // keep whitespace tokens
          .filter((w) => w.length > 0)
          .map((w) => ({ w, code: seg.code })),
      ),
    [text],
  );
  const realWords = words.filter((t) => t.w.trim().length > 0).length;
  const spokenCount = Math.round(progress * realWords);

  let seen = 0;
  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {words.map((t, i) => {
        if (t.w.trim().length === 0) return <span key={i}>{t.w}</span>;
        seen += 1;
        const spoken = seen <= spokenCount || progress >= 1;
        const cls = `${spoken ? "cap-spoken" : "cap-rest"}${t.code ? " cap-code" : ""}`;
        return (
          <span key={i} className={cls}>
            {t.w}
          </span>
        );
      })}
    </p>
  );
}
