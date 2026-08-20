import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { BOARD_CHAT_SCHEMA, BOARD_CHAT_SYSTEM, boardChatUserMessage } from "@/lib/prompts";
import { demoBoardChat } from "@/lib/demo";
import {
  asPart,
  asText,
  asTrimmed,
  getErrorMessage,
  jsonError,
  readJsonBody,
  safeParseJson,
} from "@/lib/serverUtils";
import type { BoardItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface BoardChatResult {
  reply: string;
  boardItem: { kind: string; text: string; emphasis: boolean };
}

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");

  const studentSaid = asTrimmed(body.studentSaid);
  const part = asPart(body.part);
  if (!studentSaid) return jsonError("`studentSaid` is required");
  if (!part) return jsonError("`part` is required");

  if (isDemoMode()) {
    return Response.json(demoBoardChat(studentSaid));
  }

  try {
    // The coach (Opus 4.8) is plenty fast at low effort for a quick chat reply.
    const tune = reasoning(MODELS.coach, "low");
    const resp = await getClient().messages.create({
      model: MODELS.coach,
      max_tokens: 900,
      system: [{ type: "text", text: BOARD_CHAT_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: boardChatUserMessage({
            projectName: asTrimmed(body.projectName, "the app") || "the app",
            part,
            boardSoFar: asText(body.boardSoFar, "(board is being drawn)"),
            studentSaid,
            lastAsk: asTrimmed(body.lastAsk) || undefined,
          }),
        },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: { format: { type: "json_schema", schema: BOARD_CHAT_SCHEMA }, ...(tune.output_config ?? {}) },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = safeParseJson<BoardChatResult>(text);

    const item =
      parsed.boardItem && parsed.boardItem.kind !== "none" && parsed.boardItem.text
        ? (parsed.boardItem as BoardItem)
        : null;
    return Response.json({ reply: parsed.reply, boardItem: item });
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
