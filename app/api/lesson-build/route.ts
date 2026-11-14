import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { LESSON_BUILD_SCHEMA, LESSON_BUILD_SYSTEM, lessonBuildUserMessage } from "@/lib/prompts";
import { demoBuildLesson } from "@/lib/demo";
import {
  asNumber,
  asPart,
  asText,
  asTrimmed,
  getErrorMessage,
  jsonError,
  readJsonBody,
  textLimitError,
  parseReply,
} from "@/lib/serverUtils";
import type { BuildLesson, CodeBeat } from "@/lib/types";
import { beatsFormValidDoc } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request): Promise<Response> {
  const body = await readJsonBody(req);
  if (!body) return jsonError("Invalid JSON body");
  const tooBig = textLimitError(body);
  if (tooBig) return tooBig;

  const part = asPart(body.part);
  if (!part || !part.buildSpec) return jsonError("`part` with a buildSpec is required");

  const projectType = asTrimmed(body.projectType, "App") || "App";
  const partNumber = asNumber(body.partNumber, 1);
  const totalParts = asNumber(body.totalParts, 1);
  const currentCode = asText(body.currentCode);
  const projectName = asTrimmed(body.projectName) || projectType;

  if (isDemoMode()) {
    return Response.json(demoBuildLesson({ part, partNumber, currentCode, projectName }));
  }

  try {
    // The builder writes a small file + narration; low effort keeps it fast and snappy.
    const tune = reasoning(MODELS.builder, "low");
    const resp = await getClient().messages.create({
      model: MODELS.builder,
      max_tokens: 16000,
      system: [{ type: "text", text: LESSON_BUILD_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: lessonBuildUserMessage({
            projectName,
            bigPicture: asText(body.bigPicture),
            projectType,
            partNumber,
            totalParts,
            part,
            currentCode,
            favoriteGame: asTrimmed(body.favoriteGame),
            name: asTrimmed(body.name),
          }),
        },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: {
        format: { type: "json_schema", schema: LESSON_BUILD_SCHEMA },
        ...(tune.output_config ?? {}),
      },
    });

    const parsed = parseReply<Omit<BuildLesson, "partTitle">>(
      resp,
      "That part came out too big to write in one go — try again.",
    );
    const beats: CodeBeat[] = Array.isArray(parsed.beats) ? parsed.beats : [];
    // The beats are the app from here on — every later part builds on them. A
    // file with a section dropped or elided must not be committed as the code.
    if (!beatsFormValidDoc(beats)) {
      return jsonError("That part didn't come out as a complete app — try again.", 502);
    }
    const lesson: BuildLesson = {
      partTitle: part.title,
      intro: parsed.intro,
      beats,
      outro: parsed.outro,
      concept: parsed.concept || part.concept,
    };
    return Response.json(lesson);
  } catch (err) {
    return jsonError(getErrorMessage(err), 502);
  }
}
