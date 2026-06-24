"use client";

import { useMemo } from "react";

/**
 * Live "karaoke" caption like the reference image: the words spoken so far are
 * dark/bold, the rest are greyed. `progress` is 0..1 through the line.
 */
export function Caption({ text, progress }: { text: string; progress: number }) {
  // Precompute word data to avoid mutating variables during render.
  const wordData = useMemo(() => {
    const tokens = text.split(/(\s+)/);
    let realIdx = 0;
    return tokens.map((w) => ({ w, idx: w.trim().length === 0 ? -1 : ++realIdx }));
  }, [text]);

  const realWords = wordData.filter(({ idx }) => idx !== -1).length;
  const spokenCount = Math.round(progress * realWords);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {wordData.map(({ w, idx }, i) => {
        if (idx === -1) return <span key={i}>{w}</span>;
        const spoken = idx <= spokenCount || progress >= 1;
        return (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
