import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { CODE_ASK_SCHEMA, CODE_ASK_SYSTEM, codeAskUserMessage } from "@/lib/prompts";
import { demoCodeAsk } from "@/lib/demo";
import { getErrorMessage, jsonError, safeParseJson } from "@/lib/serverUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: {
    projectName?: string;
    partTitle?: string;
    beatLabel?: string;
    beatCode?: string;
    fileSoFar?: string;
    studentSaid?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const studentSaid = (body.studentSaid ?? "").trim();
  if (!studentSaid) return jsonError("`studentSaid` is required");

  if (isDemoMode()) {
    return Response.json(demoCodeAsk(studentSaid, body.beatCode ?? ""));
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
            projectName: body.projectName ?? "the app",
            partTitle: body.partTitle ?? "this part",
            beatLabel: body.beatLabel ?? "this chunk",
            beatCode: body.beatCode ?? "",
            fileSoFar: body.fileSoFar ?? "",
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
    console.error("[code-ask]", err);
    return jsonError(getErrorMessage(err), 502);
  }
}
