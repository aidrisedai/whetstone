import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { EXTEND_SCHEMA, EXTEND_SYSTEM, extendUserMessage } from "@/lib/prompts";
import { demoExtendPart } from "@/lib/demo";
import { getErrorMessage, jsonError, safeParseJson } from "@/lib/serverUtils";
import { uid } from "@/lib/format";
import type { BuildPart } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: {
    projectName?: string;
    refinedPrompt?: string;
    request?: string;
    currentCode?: string;
    knownConcepts?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const request = (body.request ?? "").trim();
  if (!request) return jsonError("`request` is required");

  if (isDemoMode()) {
    return Response.json({ ...demoExtendPart(request), id: uid("part") });
  }

  try {
    const tune = reasoning(MODELS.coach, "medium");
    const resp = await getClient().messages.create({
      model: MODELS.coach,
      max_tokens: 1200,
      system: [{ type: "text", text: EXTEND_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: extendUserMessage({
            projectName: body.projectName ?? "the app",
            refinedPrompt: body.refinedPrompt ?? "",
            request,
            currentCode: body.currentCode ?? "",
            knownConcepts: Array.isArray(body.knownConcepts) ? body.knownConcepts : [],
          }),
        },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: EXTEND_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const part = safeParseJson<Omit<BuildPart, "id">>(text);
    return Response.json({ ...part, id: uid("part") } satisfies BuildPart);
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
