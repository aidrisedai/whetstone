import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { criteriaReuseMessage, toAnthropicMessages } from "@/lib/messages";
import { SCORE_SCHEMA, SCORE_SYSTEM } from "@/lib/prompts";
import { DEFAULT_THRESHOLD, finalizeAssessment, normalizeDynamicCriteria } from "@/lib/scoring";
import { demoAssessment } from "@/lib/demo";
import {
  asChatHistory,
  asCriteria,
  getErrorMessage,
  jsonError,
  readJsonBody,
  safeParseJson,
} from "@/lib/serverUtils";
import type { Assessment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawAssessment = Omit<Assessment, "overall" | "ready" | "threshold">;

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");

  const history = asChatHistory(body.history);
  const priorCriteria = asCriteria(body.priorCriteria);
  if (!history) {
    return jsonError("`history` must be a non-empty array of messages");
  }

  const threshold = DEFAULT_THRESHOLD;

  if (isDemoMode()) {
    return Response.json(demoAssessment(history, priorCriteria, threshold));
  }

  try {
    const messages = toAnthropicMessages(history);
    if (priorCriteria && priorCriteria.length > 0) {
      messages.push(criteriaReuseMessage(priorCriteria));
    }

    // Deliberate judgment for scoring; effort/thinking only on models that support them.
    const tune = reasoning(MODELS.scoring, "medium");
    const resp = await getClient().messages.create({
      model: MODELS.scoring,
      max_tokens: 3000,
      system: [{ type: "text", text: SCORE_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages,
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: SCORE_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const raw = safeParseJson<RawAssessment>(text);

    const assessment = finalizeAssessment(
      {
        projectType: raw.projectType,
        clarity: raw.clarity,
        conciseness: raw.conciseness,
        dynamicCriteria: normalizeDynamicCriteria(raw.dynamicCriteria, priorCriteria),
        refinedPrompt: raw.refinedPrompt,
      },
      threshold,
    );

    return Response.json(assessment);
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
