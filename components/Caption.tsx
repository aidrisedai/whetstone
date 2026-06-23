"use client";

import { useMemo } from "react";

/**
 * Live "karaoke" caption like the reference image: the words spoken so far are
 * dark/bold, the rest are greyed. `progress` is 0..1 through the line.
 */
export function Caption({ text, progress }: { text: string; progress: number }) {
  const wordItems = useMemo(() => {
    let idx = 0;
    return text.split(/(\s+)/).map((w) => ({
      w,
      wordIdx: w.trim().length === 0 ? -1 : idx++,
    }));
  }, [text]);

  const realWords = wordItems.filter(({ wordIdx }) => wordIdx >= 0).length;
  const spokenCount = Math.round(progress * realWords);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {wordItems.map(({ w, wordIdx }, i) => {
        if (wordIdx === -1) return <span key={i}>{w}</span>;
        const spoken = wordIdx < spokenCount || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
