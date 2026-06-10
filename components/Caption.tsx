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

  const spoken = useMemo(() => {
    // Collect indices of non-space words in order, then mark the first spokenCount as spoken.
    const nonSpaceIdx = words.reduce<number[]>(
      (acc, w, i) => (w.trim().length > 0 ? [...acc, i] : acc),
      [],
    );
    const spokenSet = new Set(nonSpaceIdx.slice(0, spokenCount));
    return words.map((_, i) => spokenSet.has(i) || progress >= 1);
  }, [words, spokenCount, progress]);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {words.map((w, i) =>
        w.trim().length === 0 ? (
          <span key={i}>{w}</span>
        ) : (
          <span key={i} className={spoken[i] ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        ),
      )}
    </p>
  );
}
