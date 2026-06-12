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

  const spokenMap = useMemo(
    () =>
      words.reduce<{ map: boolean[]; seen: number }>(
        (acc, w) => {
          if (w.trim().length === 0) return { ...acc, map: [...acc.map, false] };
          const spoken = acc.seen + 1 <= spokenCount || progress >= 1;
          return { map: [...acc.map, spoken], seen: acc.seen + 1 };
        },
        { map: [], seen: 0 },
      ).map,
    [words, spokenCount, progress],
  );

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {words.map((w, i) => (
        <span key={i} className={w.trim().length === 0 ? undefined : spokenMap[i] ? "cap-spoken" : "cap-rest"}>
          {w}
        </span>
      ))}
    </p>
  );
}
