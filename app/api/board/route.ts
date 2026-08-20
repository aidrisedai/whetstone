import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { BOARD_SCHEMA, BOARD_SYSTEM, boardUserMessage } from "@/lib/prompts";
import { demoBoardLesson } from "@/lib/demo";
import {
  asNumber,
  asPart,
  asText,
  asTrimmed,
  getErrorMessage,
  jsonError,
  readJsonBody,
  safeParseJson,
} from "@/lib/serverUtils";
import type { BoardLesson, BoardStep } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");

  const part = asPart(body.part);
  if (!part || !part.title) return jsonError("`part` with a title is required");
  const partNumber = asNumber(body.partNumber, 1);
  const totalParts = asNumber(body.totalParts, 1);
  const projectName = asTrimmed(body.projectName, "your app") || "your app";

  if (isDemoMode()) {
    return Response.json(demoBoardLesson(part, projectName));
  }

  try {
    const tune = reasoning(MODELS.coach, "medium");
    const resp = await getClient().messages.create({
      model: MODELS.coach,
      max_tokens: 2500,
      system: [{ type: "text", text: BOARD_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: boardUserMessage({
            projectName,
            bigPicture: asText(body.bigPicture),
            part,
            partNumber,
            totalParts,
            name: asTrimmed(body.name),
            favoriteGame: asTrimmed(body.favoriteGame),
          }),
        },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: BOARD_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = safeParseJson<{ boardTitle: string; steps: BoardStep[]; closing: string }>(text);
    const lesson: BoardLesson = {
      partTitle: part.title,
      boardTitle: parsed.boardTitle,
      steps: (parsed.steps || []).filter((s) => s && s.say).map((s) => ({
        say: s.say,
        items: (Array.isArray(s.items) ? s.items : []).map((it) => ({
          ...it,
          // The schema allows "none"; drop it so it doesn't become a CSS class.
          color: it.color && it.color !== ("none" as typeof it.color) ? it.color : undefined,
        })),
        ask: s.ask && s.ask.trim() ? s.ask.trim() : undefined,
      })),
      closing: parsed.closing,
    };
    return Response.json(lesson);
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
