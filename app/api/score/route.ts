import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { criteriaReuseMessage, toAnthropicMessages } from "@/lib/messages";
import { SCORE_SCHEMA, SCORE_SYSTEM } from "@/lib/prompts";
import { DEFAULT_THRESHOLD, finalizeAssessment, normalizeDynamicCriteria } from "@/lib/scoring";
import { demoAssessment } from "@/lib/demo";
import { getErrorMessage, jsonError, safeParseJson } from "@/lib/serverUtils";
import type { Assessment, ChatMessage, CriterionSpec } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawAssessment = Omit<Assessment, "overall" | "ready" | "threshold">;

export async function POST(req: Request): Promise<Response> {
  let body: { history?: ChatMessage[]; priorCriteria?: CriterionSpec[] | null };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const history = body.history ?? [];
  const priorCriteria = body.priorCriteria ?? null;
  if (!Array.isArray(history) || history.length === 0) {
    return jsonError("`history` must be a non-empty array");
  }

  // Guard against oversized payloads and prompt injection via priorCriteria.
  const totalContentLength = history.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
  if (totalContentLength > 200_000) {
    return jsonError("Message history is too large");
  }
  const validatedCriteria: CriterionSpec[] | null =
    Array.isArray(priorCriteria)
      ? priorCriteria
          .filter(
            (c): c is CriterionSpec =>
              c != null &&
              typeof c === "object" &&
              typeof c.key === "string" && c.key.length > 0 && c.key.length <= 64 &&
              typeof c.label === "string" && c.label.length > 0 && c.label.length <= 128 &&
              typeof c.bestPractice === "string" && c.bestPractice.length > 0 && c.bestPractice.length <= 512,
          )
          .slice(0, 3)
      : null;

  const threshold = DEFAULT_THRESHOLD;

  if (isDemoMode()) {
    return Response.json(demoAssessment(history, validatedCriteria, threshold));
  }

  try {
    const messages = toAnthropicMessages(history);
    if (validatedCriteria && validatedCriteria.length > 0) {
      messages.push(criteriaReuseMessage(validatedCriteria));
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
        dynamicCriteria: normalizeDynamicCriteria(raw.dynamicCriteria, validatedCriteria),
        refinedPrompt: raw.refinedPrompt,
      },
      threshold,
    );

    return Response.json(assessment);
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
