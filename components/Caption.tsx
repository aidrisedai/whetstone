"use client";

import { useMemo } from "react";

/**
 * Live "karaoke" caption like the reference image: the words spoken so far are
 * dark/bold, the rest are greyed. `progress` is 0..1 through the line.
 */
export function Caption({ text, progress }: { text: string; progress: number }) {
  const wordMeta = useMemo(() => {
    const tokens = text.split(/(\s+)/); // keep whitespace tokens
    return tokens.map((w, i) => ({
      text: w,
      isWord: w.trim().length > 0,
      wordIndex: tokens.slice(0, i + 1).filter((t) => t.trim().length > 0).length,
    }));
  }, [text]);

  const realWords = wordMeta.filter((m) => m.isWord).length;
  const spokenCount = Math.round(progress * realWords);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {wordMeta.map((m, i) =>
        !m.isWord ? (
          <span key={i}>{m.text}</span>
        ) : (
          <span key={i} className={m.wordIndex <= spokenCount || progress >= 1 ? "cap-spoken" : "cap-rest"}>
            {m.text}
          </span>
        ),
      )}
    </p>
  );
}
