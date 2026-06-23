"use client";

import { useMemo } from "react";

/**
 * Live "karaoke" caption like the reference image: the words spoken so far are
 * dark/bold, the rest are greyed. `progress` is 0..1 through the line.
 */
export function Caption({ text, progress }: { text: string; progress: number }) {
  // Split into tokens (words + whitespace runs). Whitespace tokens are rendered as-is.
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);

  // Pre-annotate each token with its cumulative word index (stable across renders).
  const annotated = useMemo(() => {
    let idx = 0;
    return tokens.map((w) => {
      const isWord = w.trim().length > 0;
      if (isWord) idx += 1;
      return { w, isWord, wordIdx: idx };
    });
  }, [tokens]);

  const totalWords = annotated[annotated.length - 1]?.wordIdx ?? 0;
  const spokenCount = Math.round(progress * totalWords);

  return (
    <p className="text-center text-[17px] leading-snug sm:text-lg">
      {annotated.map(({ w, isWord, wordIdx }, i) =>
        isWord ? (
          <span key={i} className={wordIdx <= spokenCount || progress >= 1 ? "cap-spoken" : "cap-rest"}>
            {w}
          </span>
        ) : (
          <span key={i}>{w}</span>
        ),
      )}
    </p>
  );
}
