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

  // Precompute word indices (null for whitespace-only tokens) so render stays pure.
  const indexed = useMemo(() => {
    let idx = 0;
    return words.map((w) => ({ text: w, wordIdx: w.trim().length === 0 ? null : idx++ }));
  }, [words]);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {indexed.map(({ text: w, wordIdx }, i) => {
        if (wordIdx === null) return <span key={i}>{w}</span>;
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
