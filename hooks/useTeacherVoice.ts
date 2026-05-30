"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

type VoiceKind = "hd" | "browser" | "none";

/**
 * The teacher's voice. Prefers server-side Google Cloud TTS (natural "HD"
 * voice); falls back to the browser's built-in voice only when Google TTS isn't
 * configured or genuinely fails. Handles the browser autoplay policy: the very
 * first sound needs a user gesture, so we unlock an <audio> element on first
 * interaction and never drop to the robotic voice just because autoplay was
 * blocked.
 */
export function useTeacherVoice() {
  const browser = useSpeechSynthesis();
  const [speaking, setSpeaking] = useState(false);
  const [activeKind, setActiveKind] = useState<VoiceKind>("none");
  // null = unknown yet; true/false once we learn from the server.
  const [hdAvailable, setHdAvailable] = useState<boolean | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reqIdRef = useRef(0);
  const unlockedRef = useRef(false);

  useEffect(() => {
    setSpeaking(browser.speaking);
  }, [browser.speaking]);

  // Learn once whether Google TTS is configured (so the UI can show "HD voice").
  useEffect(() => {
    let alive = true;
    fetch("/api/speak", { method: "GET" })
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d: { configured?: boolean }) => {
        if (alive) setHdAvailable(!!d.configured);
      })
      .catch(() => alive && setHdAvailable(false));
    return () => {
      alive = false;
    };
  }, []);

  // Create/unlock a single reusable <audio> element on the first user gesture.
  // Browsers allow programmatic play() once an element has been started by a
  // gesture, so this keeps Google audio working for the rest of the session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const unlock = () => {
      if (unlockedRef.current) return;
      const a = new Audio();
      a.muted = true;
      // A 1-frame silent play primes the element; ignore rejection.
      a.play().catch(() => {});
      a.pause();
      a.muted = false;
      audioRef.current = a;
      unlockedRef.current = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const stop = useCallback(() => {
    reqIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      try {
        audioRef.current.currentTime = 0;
      } catch {
        /* ignore */
      }
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
        if (myId !== reqIdRef.current) return;

        if (res.status === 200) {
          setHdAvailable(true);
          const blob = await res.blob();
          if (myId !== reqIdRef.current) return;
          const url = URL.createObjectURL(blob);
          // Reuse the unlocked element so autoplay policy doesn't block us.
          const audio = audioRef.current ?? new Audio();
          audioRef.current = audio;
          audio.src = url;
          audio.onplay = () => {
            setSpeaking(true);
            setActiveKind("hd");
          };
          audio.onended = () => {
            setSpeaking(false);
            URL.revokeObjectURL(url);
          };
          audio.onerror = () => {
            setSpeaking(false);
            URL.revokeObjectURL(url);
          };
          try {
            await audio.play();
            return; // HD voice playing — do NOT fall back
          } catch {
            // Autoplay blocked (no gesture yet). Don't use the robotic voice for
            // this line; the next line (after the user has clicked) will speak HD.
            URL.revokeObjectURL(url);
            return;
          }
        }

        if (res.status === 204) {
          // Server says Google TTS isn't configured → browser voice is expected.
          setHdAvailable(false);
        }
      } catch {
        /* network error → browser fallback below */
      }
      if (myId === reqIdRef.current) {
        browser.speak(t);
        setActiveKind("browser");
      }
    },
    [browser, stop],
  );

  return { supported: true, speaking, speak, stop, activeKind, hdAvailable };
}
