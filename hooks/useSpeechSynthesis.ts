"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Prefer natural-sounding system voices over the old robotic defaults. */
const PREFERRED = [
  "Google US English",
  "Samantha",
  "Ava",
  "Allison",
  "Serena",
  "Microsoft Aria",
  "Microsoft Jenny",
  "Karen",
  "Moira",
];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const pool = en.length ? en : voices;
  for (const name of PREFERRED) {
    const hit = pool.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
    if (hit) return hit;
  }
  // Avoid known low-quality fallbacks; prefer a local en-US voice.
  const enUS = pool.find((v) => v.lang === "en-US" && v.localService) || pool.find((v) => v.lang === "en-US");
  return enUS || pool[0];
}

/**
 * Browser SpeechSynthesis fallback — used only when Google Cloud TTS isn't
 * available. Picks the best natural voice the OS offers instead of the default
 * robotic one.
 */
export function useSpeechSynthesis() {
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => {
      voiceRef.current = pickVoice(synth.getVoices());
    };
    load();
    // Voices load asynchronously on most browsers.
    synth.addEventListener?.("voiceschanged", load);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      synth.cancel();
    };
  }, [supported]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (!voiceRef.current) voiceRef.current = pickVoice(synth.getVoices());
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  return { supported, speaking, speak, cancel };
}
