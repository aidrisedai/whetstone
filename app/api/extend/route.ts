import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { EXTEND_SCHEMA, EXTEND_SYSTEM, extendUserMessage } from "@/lib/prompts";
import { demoExtendPart } from "@/lib/demo";
import {
  asStringArray,
  asText,
  asTrimmed,
  getErrorMessage,
  jsonError,
  readJsonBody,
  textLimitError,
  parseReply,
} from "@/lib/serverUtils";
import { uid } from "@/lib/format";
import type { BuildPart } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");
  const tooBig = textLimitError(body);
  if (tooBig) return tooBig;

  const request = asTrimmed(body.request);
  if (!request) return jsonError("`request` is required");

  if (isDemoMode()) {
    return Response.json({ ...demoExtendPart(request), id: uid("part") });
  }

  try {
    const tune = reasoning(MODELS.coach, "medium");
    const resp = await getClient().messages.create({
      model: MODELS.coach,
      max_tokens: 2500,
      system: [{ type: "text", text: EXTEND_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: extendUserMessage({
            projectName: asTrimmed(body.projectName, "the app") || "the app",
            refinedPrompt: asText(body.refinedPrompt),
            request,
            currentCode: asText(body.currentCode),
            knownConcepts: asStringArray(body.knownConcepts),
          }),
        },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: EXTEND_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const part = parseReply<Omit<BuildPart, "id">>(resp);
    return Response.json({ ...part, id: uid("part") } satisfies BuildPart);
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
