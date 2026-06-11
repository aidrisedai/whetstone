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

  // Precompute spoken flag for each token using an immutable reduce.
  const { flags: spokenFlags } = words.reduce(
    (acc: { flags: boolean[]; seen: number }, w: string) => {
      if (!w.trim()) return { flags: [...acc.flags, false], seen: acc.seen };
      const seen = acc.seen + 1;
      return { flags: [...acc.flags, seen <= spokenCount || progress >= 1], seen };
    },
    { flags: [], seen: 0 },
  );

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {words.map((w, i) => {
        if (w.trim().length === 0) return <span key={i}>{w}</span>;
        return (
          <span key={i} className={spokenFlags[i] ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        );
      })}
    </p>
  );
}
