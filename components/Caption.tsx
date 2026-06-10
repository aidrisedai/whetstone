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

  const annotated = useMemo(() => {
    let count = 0;
    return words.map((w, i) => {
      if (w.trim().length === 0) return { w, i, space: true, spoken: true };
      count++;
      return { w, i, space: false, spoken: count <= spokenCount || progress >= 1 };
    });
  }, [words, spokenCount, progress]);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {annotated.map(({ w, i, space, spoken }) =>
        space ? (
          <span key={i}>{w}</span>
        ) : (
          <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        ),
      )}
    </p>
  );
}
