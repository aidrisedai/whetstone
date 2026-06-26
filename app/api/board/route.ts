import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { BOARD_SCHEMA, BOARD_SYSTEM, boardUserMessage } from "@/lib/prompts";
import { demoBoardLesson } from "@/lib/demo";
import { getErrorMessage, jsonError, safeParseJson } from "@/lib/serverUtils";
import type { BoardLesson, BoardStep } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PartInput {
  title: string;
  whatItIs: string;
  concept: string;
  buildSpec: string;
}

export async function POST(req: Request): Promise<Response> {
  let body: {
    projectName?: string;
    bigPicture?: string;
    part?: PartInput;
    partNumber?: number;
    totalParts?: number;
    name?: string;
    favoriteGame?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const part = body.part;
  if (!part || !part.title) return jsonError("`part` is required");
  const partNumber = typeof body.partNumber === "number" ? body.partNumber : 1;
  const totalParts = typeof body.totalParts === "number" ? body.totalParts : 1;

  if (isDemoMode()) {
    return Response.json(demoBoardLesson(part, body.projectName ?? "your app"));
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
            projectName: body.projectName ?? "the app",
            bigPicture: body.bigPicture ?? "",
            part,
            partNumber,
            totalParts,
            name: body.name ?? "",
            favoriteGame: body.favoriteGame ?? "",
          }),
        },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: BOARD_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return jsonError("Model returned no structured output", 502);
    }
    const parsed = safeParseJson<{ boardTitle: string; steps: BoardStep[]; closing: string }>(textBlock.text);
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
