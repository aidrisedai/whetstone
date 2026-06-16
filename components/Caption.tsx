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

  // Pre-compute each word's position index to avoid mutating a variable during render.
  const taggedWords = useMemo(() => {
    let wordIdx = 0;
    return words.map((w) => {
      const isSpace = w.trim().length === 0;
      if (!isSpace) wordIdx += 1;
      return { w, wordIdx, isSpace };
    });
  }, [words]);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {taggedWords.map(({ w, wordIdx, isSpace }, i) => {
        if (isSpace) return <span key={i}>{w}</span>;
        const spoken = wordIdx <= spokenCount || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
