"use client";

import { useMemo } from "react";

/**
 * Live "karaoke" caption like the reference image: the words spoken so far are
 * dark/bold, the rest are greyed. `progress` is 0..1 through the line.
 */
export function Caption({ text, progress }: { text: string; progress: number }) {
  const words = useMemo(() => text.split(/(\s+)/), [text]); // keep whitespace tokens
  // Precompute word sequence indices so render is pure (no mutation during map).
  const wordData = useMemo(() => {
    let count = 0;
    return words.map((w) => ({ w, n: w.trim() ? ++count : 0 }));
  }, [words]);
  const realWords = wordData.filter((d) => d.n > 0).length;
  const spokenCount = Math.round(progress * realWords);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {wordData.map(({ w, n }, i) => {
        if (!n) return <span key={i}>{w}</span>;
        const spoken = n <= spokenCount || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
