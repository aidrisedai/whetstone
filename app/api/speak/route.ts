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
  const url = apiKey ? `${TTS_ENDPOINT}?key=${encodeURIComponent(apiKey)}` : TTS_ENDPOINT;

  const payload = {
    input: { text },
    voice: {
      languageCode: process.env.GOOGLE_TTS_LANG || "en-US",
      name: process.env.GOOGLE_TTS_VOICE || "en-US-Chirp3-HD-Charon",
    },
    audioConfig: { audioEncoding: "MP3", speakingRate: 1.03, pitch: 0 },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Fall back to browser voice rather than blocking the lesson.
      return new Response(null, { status: 204 });
    }

    const data = (await res.json()) as { audioContent?: string };
    if (!data.audioContent) return new Response(null, { status: 204 });

    const audio = Buffer.from(data.audioContent, "base64");
    return new Response(audio, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
