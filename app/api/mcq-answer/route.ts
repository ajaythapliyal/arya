import { z } from "zod";
import { handleMcqAnswer } from "@/lib/syllabus-state";

const McqAnswerRequestSchema = z.object({
  sessionId: z.string().min(1),
  optionId: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsedBody = McqAnswerRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(
      { error: "Request body must include `sessionId` and `optionId`." },
      { status: 400 },
    );
  }

  const result = await handleMcqAnswer(parsedBody.data.sessionId, parsedBody.data.optionId);
  if ("error" in result) {
    return Response.json(result, { status: 409 });
  }
  return Response.json(result);
}
