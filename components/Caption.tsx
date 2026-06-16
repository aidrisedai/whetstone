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
  // Pre-compute real-word index for each token (0 for whitespace tokens).
  const wordIndices = useMemo(() => {
    let count = 0;
    return words.map((w) => (w.trim().length > 0 ? ++count : 0));
  }, [words]);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {words.map((w, i) => {
        if (wordIndices[i] === 0) return <span key={i}>{w}</span>;
        const spoken = wordIndices[i] <= spokenCount || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
