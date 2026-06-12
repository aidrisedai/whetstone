"use client";

import { useMemo } from "react";

/**
 * Live "karaoke" caption like the reference image: the words spoken so far are
 * dark/bold, the rest are greyed. `progress` is 0..1 through the line.
 */
export function Caption({ text, progress }: { text: string; progress: number }) {
  const words = useMemo(() => text.split(/(\s+)/), [text]); // keep whitespace tokens
  // Pre-compute the 1-based word position for each token (0 for whitespace tokens).
  const wordPos = useMemo(() => {
    let c = 0;
    return words.map((w) => (w.trim().length > 0 ? ++c : 0));
  }, [words]);
  const realWords = wordPos[wordPos.length - 1] ?? 0;
  const spokenCount = Math.round(progress * realWords);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {words.map((w, i) => {
        if (w.trim().length === 0) return <span key={i}>{w}</span>;
        const spoken = wordPos[i] <= spokenCount || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
