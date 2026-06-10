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
  // Pre-compute the 1-based ordinal for each non-whitespace word (-1 for spaces).
  const realIndices = useMemo(() => {
    let idx = 0;
    return words.map((w) => (w.trim().length === 0 ? -1 : ++idx));
  }, [words]);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {words.map((w, i) => {
        if (realIndices[i] === -1) return <span key={i}>{w}</span>;
        const spoken = realIndices[i] <= spokenCount || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
