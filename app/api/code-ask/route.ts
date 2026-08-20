import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { CODE_ASK_SCHEMA, CODE_ASK_SYSTEM, codeAskUserMessage } from "@/lib/prompts";
import { demoCodeAsk } from "@/lib/demo";
import { asText, asTrimmed, getErrorMessage, jsonError, readJsonBody, safeParseJson } from "@/lib/serverUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");

  const studentSaid = asTrimmed(body.studentSaid);
  const beatCode = asText(body.beatCode);
  if (!studentSaid) return jsonError("`studentSaid` is required");

  if (isDemoMode()) {
    return Response.json(demoCodeAsk(studentSaid, beatCode));
  }

  try {
    // Fast turnaround for a live "raised hand": coach model at low effort.
    const tune = reasoning(MODELS.coach, "low");
    const resp = await getClient().messages.create({
      model: MODELS.coach,
      max_tokens: 900,
      system: [{ type: "text", text: CODE_ASK_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: codeAskUserMessage({
            projectName: asTrimmed(body.projectName, "the app") || "the app",
            partTitle: asTrimmed(body.partTitle, "this part") || "this part",
            beatLabel: asTrimmed(body.beatLabel, "this chunk") || "this chunk",
            beatCode,
            fileSoFar: asText(body.fileSoFar),
            studentSaid,
          }),
        },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: CODE_ASK_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = safeParseJson<{ reply: string; highlightHint: string }>(text);
    const hint = parsed.highlightHint && parsed.highlightHint !== "none" ? parsed.highlightHint : null;
    return Response.json({ reply: parsed.reply, highlightHint: hint });
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
