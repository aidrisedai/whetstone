import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { COACH_SCHEMA, COACH_SYSTEM, coachUserMessage } from "@/lib/prompts";
import { demoCoach } from "@/lib/demo";
import { asNumber, asTrimmed, getErrorMessage, jsonError, readJsonBody, safeParseJson } from "@/lib/serverUtils";
import type { CoachNote } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");

  const refinedPrompt = asTrimmed(body.refinedPrompt);
  const projectType = asTrimmed(body.projectType, "App") || "App";
  const step = asNumber(body.step, 1);
  const changeRequest = asTrimmed(body.changeRequest);
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
