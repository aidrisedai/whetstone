"use client";

import { useMemo } from "react";

/**
 * Live "karaoke" caption like the reference image: the words spoken so far are
 * dark/bold, the rest are greyed. `progress` is 0..1 through the line.
 */
export function Caption({ text, progress }: { text: string; progress: number }) {
  const words = useMemo(() => text.split(/(\s+)/), [text]); // keep whitespace tokens
  const realWords = words.filter((w) => w.trim().length > 0).length;
  const spokenCount = Math.round(progress * realWords);

  // Precompute each word's position among real (non-whitespace) words so the
  // render function stays pure (no mutation inside the map callback).
  const wordItems = useMemo(() => {
    let count = 0;
    return words.map((w, i) => ({ w, i, pos: w.trim().length > 0 ? ++count : 0 }));
  }, [words]);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {wordItems.map(({ w, i, pos }) => {
        if (w.trim().length === 0) return <span key={i}>{w}</span>;
        const spoken = pos <= spokenCount || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
