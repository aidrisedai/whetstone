"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

type VoiceKind = "hd" | "browser" | "none";

/** Build a tiny valid silent WAV blob URL used to "unlock" audio on a gesture. */
function makeSilentUrl(): string {
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
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  w(36, "data");
  view.setUint32(40, numSamples, true);
  for (let i = 0; i < numSamples; i++) view.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

/**
 * The teacher's voice. Prefers server-side Google Cloud TTS ("HD"); falls back
 * to the browser voice only when HD isn't configured or genuinely fails.
 *
 * Uses ONE real <audio> element attached to the DOM (more reliable across
 * browsers than a detached `new Audio()`), primed with a silent clip on the
 * first user gesture to satisfy autoplay policy. Exposes a human-readable
 * `status` so the UI can show exactly what happened (HD playing / fell back / why).
 */
export function useTeacherVoice() {
  const browser = useSpeechSynthesis();
  const [speaking, setSpeaking] = useState(false);
  const [activeKind, setActiveKind] = useState<VoiceKind>("none");
  const [hdAvailable, setHdAvailable] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silentUrlRef = useRef<string | null>(null);
  const lastBlobUrlRef = useRef<string | null>(null);
  const reqIdRef = useRef(0);
  const primedRef = useRef(false);

  // One DOM-attached <audio> element + the silent primer, created once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = document.createElement("audio");
    el.setAttribute("playsinline", "");
    el.preload = "auto";
    el.style.display = "none";
    document.body.appendChild(el);
    audioRef.current = el;
    silentUrlRef.current = makeSilentUrl();
    return () => {
      el.remove();
      if (silentUrlRef.current) URL.revokeObjectURL(silentUrlRef.current);
      if (lastBlobUrlRef.current) URL.revokeObjectURL(lastBlobUrlRef.current);
    };
  }, []);

  // Learn whether Google HD voice is configured on the server.
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

  const prime = useCallback(() => {
    const a = audioRef.current;
    const url = silentUrlRef.current;
    if (!a || !url || primedRef.current) return;
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
        /* retried on next gesture */
      });
  }, []);

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
          if (lastBlobUrlRef.current) URL.revokeObjectURL(lastBlobUrlRef.current);
          const url = URL.createObjectURL(blob);
          lastBlobUrlRef.current = url;
          const audio = audioRef.current;
          if (!audio) {
            setStatus("⚠️ no audio element");
            return;
          }
          audio.src = url;
          audio.muted = false;
          audio.onplay = () => {
            setSpeaking(true);
            setActiveKind("hd");
            setStatus(`🔊 HD voice playing (${Math.round(blob.size / 1024)}KB)`);
          };
          audio.onended = () => setSpeaking(false);
          audio.onerror = () => setStatus("⚠️ audio element error decoding HD clip");
          try {
            await audio.play();
            return; // HD playing — never fall back to the robotic voice
          } catch (e) {
            setStatus(`⚠️ play() blocked: ${e instanceof Error ? e.name : "unknown"} — click ▶/🔊 first`);
            return; // do NOT speak this line robotically
          }
        }

        if (res.status === 204) {
          setHdAvailable(false);
          setStatus("⚠️ server returned 204 (Google TTS not returning audio) — using browser voice");
        } else {
          setStatus(`⚠️ /api/speak HTTP ${res.status} — using browser voice`);
        }
      } catch (e) {
        setStatus(`⚠️ network error reaching /api/speak — using browser voice`);
      }
      if (myId === reqIdRef.current) {
        browser.speak(t);
        setActiveKind("browser");
      }
    },
    [browser, stop],
  );

  return { supported: true, speaking, speak, stop, prime, activeKind, hdAvailable, status };
}
