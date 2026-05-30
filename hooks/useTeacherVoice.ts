"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

/**
 * The teacher's voice. Tries server-side Google Cloud TTS first (natural,
 * uses the operator's Google credits); if the server returns 204 (no key) or
 * audio fails, falls back to the browser's built-in SpeechSynthesis. Exposes a
 * single speak()/stop() and a `speaking` flag regardless of which path runs.
 */
export function useTeacherVoice() {
  const browser = useSpeechSynthesis();
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    setSpeaking(browser.speaking);
  }, [browser.speaking]);

  const stop = useCallback(() => {
    reqIdRef.current += 1; // invalidate any in-flight request
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    browser.cancel();
    setSpeaking(false);
  }, [browser]);

  const speak = useCallback(
    async (text: string) => {
      const t = (text ?? "").trim();
      if (!t) return;
      stop();
      const myId = ++reqIdRef.current;

      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: t }),
        });
        if (myId !== reqIdRef.current) return; // superseded

        if (res.ok && res.status === 200) {
          const blob = await res.blob();
          if (myId !== reqIdRef.current) return;
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onplay = () => setSpeaking(true);
          audio.onended = () => {
            setSpeaking(false);
            URL.revokeObjectURL(url);
          };
          audio.onerror = () => {
            setSpeaking(false);
            URL.revokeObjectURL(url);
            browser.speak(t); // last-resort fallback
          };
          await audio.play().catch(() => browser.speak(t));
          return;
        }
      } catch {
        /* fall through to browser voice */
      }
      if (myId === reqIdRef.current) browser.speak(t);
    },
    [browser, stop],
  );

  return { supported: true, speaking, speak, stop };
}
