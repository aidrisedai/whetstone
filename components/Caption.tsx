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

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {words.reduce<{ els: React.ReactNode[]; seen: number }>(
        ({ els, seen }, w, i) => {
          if (w.trim().length === 0) {
            return { els: [...els, <span key={i}>{w}</span>], seen };
          }
          const next = seen + 1;
          const spoken = next <= spokenCount || progress >= 1;
          return {
            els: [
              ...els,
              <span key={i} className={spoken ? "cap-spoken" : "cap-rest"}>
                {w}
              </span>,
            ],
            seen: next,
          };
        },
        { els: [], seen: 0 },
      ).els}
    </p>
  );
}
