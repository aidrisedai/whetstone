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

  // Pre-compute spoken state per token so render stays mutation-free.
  const spokenMap = useMemo(() => {
    let seen = 0;
    return words.map((w) => {
      if (w.trim().length === 0) return false;
      seen += 1;
      return seen <= spokenCount;
    });
  }, [words, spokenCount]);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {words.map((w, i) => {
        if (w.trim().length === 0) return <span key={i}>{w}</span>;
        const spoken = spokenMap[i] || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
