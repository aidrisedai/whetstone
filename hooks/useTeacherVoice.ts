"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

type VoiceKind = "hd" | "browser" | "none";

/** Build a tiny (0.1s) valid silent WAV blob URL used to "unlock" audio. */
function makeSilentUrl(): string {
  const sampleRate = 8000;
  const numSamples = 800;
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);
  const w = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  view.setUint32(4, 36 + numSamples, true);
  w(8, "WAVE");
  w(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  w(36, "data");
  view.setUint32(40, numSamples, true);
  for (let i = 0; i < numSamples; i++) view.setUint8(44 + i, 128); // 8-bit silence
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

/**
 * The teacher's voice. Prefers server-side Google Cloud TTS (natural "HD"
 * voice); falls back to the browser voice only when Google TTS isn't configured
 * or genuinely fails.
 *
 * The hard part is the browser autoplay policy: programmatic audio is blocked
 * until a real user gesture has played something on the SAME element. We solve
 * it by reusing ONE <audio> element and "priming" it with a silent clip the
 * first time the user interacts (or clicks Start). After that, HD audio plays
 * for the rest of the session without dropping to the robotic voice.
 */
export function useTeacherVoice() {
  const browser = useSpeechSynthesis();
  const [speaking, setSpeaking] = useState(false);
  const [activeKind, setActiveKind] = useState<VoiceKind>("none");
  const [hdAvailable, setHdAvailable] = useState<boolean | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silentUrlRef = useRef<string | null>(null);
  const reqIdRef = useRef(0);
  const primedRef = useRef(false);

  // Create the single reusable audio element + the silent primer once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    silentUrlRef.current = makeSilentUrl();
    return () => {
      if (silentUrlRef.current) URL.revokeObjectURL(silentUrlRef.current);
    };
  }, []);

  // Ask the server once whether Google HD voice is configured.
  useEffect(() => {
    let alive = true;
    fetch("/api/speak", { method: "GET" })
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d: { configured?: boolean }) => alive && setHdAvailable(!!d.configured))
      .catch(() => alive && setHdAvailable(false));
    return () => {
      alive = false;
    };
  }, []);

  /** Play a silent clip on the shared element to satisfy autoplay policy. */
  const prime = useCallback(() => {
    if (primedRef.current) return;
    const a = audioRef.current;
    const url = silentUrlRef.current;
    if (!a || !url) return;
    a.src = url;
    a.muted = false;
    a.play()
      .then(() => {
        primedRef.current = true;
        a.pause();
        try {
          a.currentTime = 0;
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* will retry on the next gesture */
      });
  }, []);

  // Prime on the first interaction anywhere, as a safety net.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onGesture = () => prime();
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [prime]);

  useEffect(() => {
    setSpeaking(browser.speaking);
  }, [browser.speaking]);

  const stop = useCallback(() => {
    reqIdRef.current += 1;
    const a = audioRef.current;
    if (a) {
      a.pause();
      try {
        a.currentTime = 0;
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
          const audio = audioRef.current ?? new Audio();
          audioRef.current = audio;
          audio.src = url;
          audio.muted = false;
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
            return; // HD voice playing — never fall back to the robotic voice
          } catch {
            // Autoplay still blocked (no gesture yet this session). Skip this
            // line's audio rather than speaking it robotically; once the user
            // clicks anything, HD audio works for every following line.
            URL.revokeObjectURL(url);
            return;
          }
        }

        if (res.status === 204) setHdAvailable(false); // Google TTS not configured
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

  return { supported: true, speaking, speak, stop, prime, activeKind, hdAvailable };
}
