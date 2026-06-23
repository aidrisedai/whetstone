import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { QUIZ_SCHEMA, QUIZ_SYSTEM, quizUserMessage } from "@/lib/prompts";
import { demoQuiz } from "@/lib/demo";
import { checkRateLimit, getErrorMessage, jsonError, safeParseJson } from "@/lib/serverUtils";
import { uid } from "@/lib/format";
import type { Checkpoint, QuizQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const rl = checkRateLimit(req);
  if (rl) return rl;
  let body: {
    projectName?: string;
    refinedPrompt?: string;
    partTitle?: string;
    concept?: string;
    newCode?: string;
    name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const partTitle = (body.partTitle ?? "this part").trim();
  const newCode = (body.newCode ?? "").trim();
  if (!newCode) return jsonError("`newCode` is required to write a grounded quiz");

  if (isDemoMode()) {
    return Response.json(demoQuiz(partTitle, body.concept ?? ""));
  }

  try {
    // The coach model writes the questions; it reasons about the actual code.
    const tune = reasoning(MODELS.coach, "medium");
    const resp = await getClient().messages.create({
      model: MODELS.coach,
      max_tokens: 2500,
      system: [{ type: "text", text: QUIZ_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: quizUserMessage({
            projectName: body.projectName ?? "the app",
            refinedPrompt: body.refinedPrompt ?? "",
            partTitle,
            concept: body.concept ?? "",
            newCode,
            name: body.name ?? "",
          }),
        },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: QUIZ_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = safeParseJson<{ intro: string; questions: Omit<QuizQuestion, "id">[] }>(text);

    const checkpoint: Checkpoint = {
      partTitle,
      intro: parsed.intro,
      questions: (parsed.questions || [])
        .filter((q) => Array.isArray(q.options) && q.options.length >= 2)
        .slice(0, 3)
        .map((q) => ({
          ...q,
          id: uid("q"),
          correctIndex: Math.max(0, Math.min(q.options.length - 1, q.correctIndex | 0)),
        })),
    };
    return Response.json(checkpoint);
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
