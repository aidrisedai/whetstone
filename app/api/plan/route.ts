import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { PLAN_SCHEMA, PLAN_SYSTEM, planUserMessage } from "@/lib/prompts";
import { demoPlan } from "@/lib/demo";
import {
  asStringArray,
  asTrimmed,
  getErrorMessage,
  jsonError,
  readJsonBody,
  safeParseJson,
} from "@/lib/serverUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");

  const refinedPrompt = asTrimmed(body.refinedPrompt);
  const projectType = asTrimmed(body.projectType, "App") || "App";
  const name = asTrimmed(body.name);
  const favoriteGame = asTrimmed(body.favoriteGame);
  const knownConcepts = asStringArray(body.knownConcepts);
  if (!refinedPrompt) return jsonError("`refinedPrompt` is required");

  if (isDemoMode()) {
    return Response.json(demoPlan(projectType, refinedPrompt, name, favoriteGame));
  }

  try {
    const tune = reasoning(MODELS.coach, "medium");
    const resp = await getClient().messages.create({
      model: MODELS.coach,
      max_tokens: 2500,
      system: [{ type: "text", text: PLAN_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: planUserMessage({ refinedPrompt, projectType, name, favoriteGame, knownConcepts }),
        },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: PLAN_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    return Response.json(safeParseJson(text));
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
