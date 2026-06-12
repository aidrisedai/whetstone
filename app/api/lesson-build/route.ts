import { getClient, isDemoMode, MODELS, reasoning } from "@/lib/anthropic";
import { LESSON_BUILD_SCHEMA, LESSON_BUILD_SYSTEM, lessonBuildUserMessage } from "@/lib/prompts";
import { demoBuildLesson } from "@/lib/demo";
import { getErrorMessage, jsonError, safeParseJson } from "@/lib/serverUtils";
import type { BuildLesson, CodeBeat } from "@/lib/types";

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
    projectType?: string;
    partNumber?: number;
    totalParts?: number;
    part?: PartInput;
    currentCode?: string;
    favoriteGame?: string;
    name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const part = body.part;
  if (!part || !part.buildSpec) return jsonError("`part` with a buildSpec is required");

  const projectType = (body.projectType ?? "App").trim();
  const partNumber = typeof body.partNumber === "number" ? body.partNumber : 1;
  const totalParts = typeof body.totalParts === "number" ? body.totalParts : 1;

  const currentCode = (body.currentCode ?? "").slice(0, 120_000);

  if (isDemoMode()) {
    return Response.json(
      demoBuildLesson({
        part,
        partNumber,
        currentCode,
        projectName: body.projectName ?? projectType,
      }),
    );
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
            projectName: body.projectName ?? projectType,
            bigPicture: body.bigPicture ?? "",
            projectType,
            partNumber,
            totalParts,
            part,
            currentCode,
            favoriteGame: body.favoriteGame ?? "",
            name: body.name ?? "",
          }),
        },
      ],
      ...(tune.thinking ? { thinking: tune.thinking } : {}),
      output_config: {
        format: { type: "json_schema", schema: LESSON_BUILD_SCHEMA },
        ...(tune.output_config ?? {}),
      },
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const parsed = safeParseJson<Omit<BuildLesson, "partTitle">>(text);
    const beats: CodeBeat[] = Array.isArray(parsed.beats) ? parsed.beats : [];
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
