"use client";

import { useMemo } from "react";

/**
 * Live "karaoke" caption like the reference image: the words spoken so far are
 * dark/bold, the rest are greyed. `progress` is 0..1 through the line.
 */
export function Caption({ text, progress }: { text: string; progress: number }) {
  const words = useMemo(() => text.split(/(\s+)/), [text]); // keep whitespace tokens
  // Precompute word indices (non-whitespace tokens only) so render stays pure.
  const tokens = useMemo(() => {
    let n = 0;
    return words.map((w) => ({ text: w, wordIndex: w.trim().length === 0 ? -1 : n++ }));
  }, [words]);
  const spokenCount = Math.round(progress * tokens.filter((t) => t.wordIndex >= 0).length);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {tokens.map(({ text: w, wordIndex }, i) => {
        if (wordIndex === -1) return <span key={i}>{w}</span>;
        const spoken = wordIndex < spokenCount || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
