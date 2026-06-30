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

  let wordIndex = 0;
  const spans = words.map((w, i) => {
    if (w.trim().length === 0) return <span key={i}>{w}</span>;
    wordIndex += 1;
    const spoken = wordIndex <= spokenCount || progress >= 1;
    return (
      <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
        {w}
      </span>
    );
  });

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {spans}
    </p>
  );
}
