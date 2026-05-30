import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { COACH_SCHEMA, COACH_SYSTEM, coachUserMessage } from "@/lib/prompts";
import { demoCoach } from "@/lib/demo";
import { getErrorMessage, jsonError, safeParseJson } from "@/lib/serverUtils";
import type { CoachNote } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: { refinedPrompt?: string; projectType?: string; step?: number; changeRequest?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const refinedPrompt = (body.refinedPrompt ?? "").trim();
  const projectType = (body.projectType ?? "App").trim();
  const step = typeof body.step === "number" ? body.step : 1;
  const changeRequest = (body.changeRequest ?? "").trim();
  if (!refinedPrompt) return jsonError("`refinedPrompt` is required");

  if (isDemoMode()) {
    return Response.json(demoCoach(step, changeRequest));
  }

  try {
    const tune = reasoning(MODELS.coach, "medium");
    const resp = await getClient().messages.create({
      model: MODELS.coach,
      max_tokens: 1200,
      system: [{ type: "text", text: COACH_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        { role: "user", content: coachUserMessage({ refinedPrompt, projectType, step, changeRequest }) },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: COACH_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    return Response.json(safeParseJson<CoachNote>(text));
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
