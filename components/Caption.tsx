"use client";

import { useMemo } from "react";

/**
 * Live "karaoke" caption like the reference image: the words spoken so far are
 * dark/bold, the rest are greyed. `progress` is 0..1 through the line.
 */
export function Caption({ text, progress }: { text: string; progress: number }) {
  // Precompute which tokens are real words and their 1-based indices so the
  // render is pure (no mutable counter inside the map).
  const classified = useMemo(() => {
    let count = 0;
    return text.split(/(\s+)/).map((w) => {
      if (w.trim().length === 0) return { word: w, idx: -1 };
      count += 1;
      return { word: w, idx: count };
    });
  }, [text]);

  const realWords = classified.filter((c) => c.idx > 0).length;
  const spokenCount = Math.round(progress * realWords);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {classified.map(({ word, idx }, i) => {
        if (idx === -1) return <span key={i}>{word}</span>;
        const spoken = idx <= spokenCount || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {word}
          </span>
        );
      })}
    </p>
  );
}
