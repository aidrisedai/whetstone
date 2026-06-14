/**
 * Server-side voice for the teacher. When a Google Cloud key is configured,
 * synthesizes natural speech via Google Cloud Text-to-Speech (uses the user's
 * Google credits). Otherwise returns 204 so the client falls back to the
 * built-in browser SpeechSynthesis voice.
 *
 * Configure with EITHER:
 *   GOOGLE_TTS_API_KEY        — a Google Cloud API key (simplest), or
 *   GOOGLE_TTS_ACCESS_TOKEN   — an OAuth access token for the TTS scope.
 * Optional: GOOGLE_TTS_VOICE (default "en-US-Chirp3-HD-Charon"),
 *           GOOGLE_TTS_LANG (default "en-US").
 */
import { jsonError } from "@/lib/serverUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";

export function googleTtsConfigured(): boolean {
  return !!(process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_ACCESS_TOKEN);
}

/** Lets the client know whether the natural "HD" voice is available. */
export function GET(): Response {
  return Response.json({ configured: googleTtsConfigured() });
}

export async function POST(req: Request): Promise<Response> {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const text = (body.text ?? "").trim().slice(0, 2000);
  if (!text) return jsonError("`text` is required");

  // No Google key → tell the client to use its own browser voice.
  if (!googleTtsConfigured()) {
    return new Response(null, { status: 204 });
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  const token = process.env.GOOGLE_TTS_ACCESS_TOKEN;

  // LINEAR16 @ 44.1kHz = a standard WAV that every browser decodes reliably.
  // (Chirp3-HD's default MP3 is MPEG-2 @ 24kHz, which some Chromium builds —
  // e.g. Dia/Arc — fail to play, causing a fallback to the robotic voice.)
  const payload = {
    input: { text },
    voice: {
      languageCode: process.env.GOOGLE_TTS_LANG || "en-US",
      name: process.env.GOOGLE_TTS_VOICE || "en-US-Chirp3-HD-Charon",
    },
    audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 44100, speakingRate: 1.03 },
  };

  try {
    const res = await fetch(TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(apiKey ? { "x-goog-api-key": apiKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      // Surface WHY (the route still falls back to the browser voice so the
      // lesson is never blocked) — silent failures here are hard to debug.
      let reason = `HTTP ${res.status}`;
      try {
        const err = (await res.json()) as { error?: { message?: string; status?: string } };
        if (err.error) reason = `${err.error.status ?? res.status}: ${err.error.message ?? ""}`;
      } catch {
        /* ignore parse failure */
      }
      console.warn(`[speak] Google TTS failed (${reason}). Falling back to browser voice.`);
      return new Response(null, { status: 204, headers: { "X-TTS-Fallback": "google-error" } });
    }

    const data = (await res.json()) as { audioContent?: string };
    if (!data.audioContent) return new Response(null, { status: 204, headers: { "X-TTS-Fallback": "no-audio" } });

    // LINEAR16 comes back as a complete WAV container (RIFF header included).
    const audio = Buffer.from(data.audioContent, "base64");
    return new Response(audio, {
      status: 200,
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.warn("[speak] Google TTS request threw; falling back to browser voice.", err);
    return new Response(null, { status: 204, headers: { "X-TTS-Fallback": "exception" } });
  }
}
