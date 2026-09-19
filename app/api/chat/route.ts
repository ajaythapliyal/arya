import { deepSeek } from "@ai-sdk/deepseek";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { after } from "next/server";
import { z } from "zod";
import { propagateAttributes } from "@langfuse/tracing";
import { ARYA_STATIC_INSTRUCTIONS } from "@/lib/arya-instructions";
import { langfuseSpanProcessor } from "@/instrumentation";
import {
  innermostTopic,
  getOrCreateActor,
  makeTools,
  buildStatusBlock,
} from "@/lib/syllabus-state";

const ChatRequestSchema = z.object({
  sessionId: z.string().min(1),
  messages: z.array(z.unknown()).min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsedBody = ChatRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    const fieldErrors = parsedBody.error.flatten().fieldErrors;
    const error = fieldErrors.messages
      ? "Request body must include a non-empty `messages` array."
      : "Request body must include a `sessionId`.";
    return Response.json({ error }, { status: 400 });
  }
  const { sessionId } = parsedBody.data;
  const messages = parsedBody.data.messages as UIMessage[];

  if (!process.env.DEEPSEEK_API_KEY) {
    return Response.json(
      { error: "Missing DEEPSEEK_API_KEY on the server." },
      { status: 500 },
    );
  }

  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(messages);
  } catch (error) {
    console.error("Failed to convert chat messages:", error);
    return Response.json(
      { error: "Request body contained malformed messages." },
      { status: 400 },
    );
  }

  const actor = getOrCreateActor(sessionId);
  const activeTopic = innermostTopic(actor.getSnapshot().value);
  const done = activeTopic === "syllabusComplete";

  const statusBlock = done
    ? "The student has completed the entire syllabus. Congratulate them and ask if they'd like to review anything."
    : buildStatusBlock(activeTopic, actor);

  const result = propagateAttributes(
    { sessionId, traceName: "chat-response" },
    () => {
      const streamResult = streamText({
        model: deepSeek("deepseek-flash"),
        instructions: ARYA_STATIC_INSTRUCTIONS, // pure constant — always cache-hits
        messages: [
          ...modelMessages,
          { role: "user" as const, content: `<current-status>\n${statusBlock}\n</current-status>` },
        ],
        abortSignal: req.signal,
        telemetry: { isEnabled: true, functionId: "arya-chat" },
        tools: makeTools(actor),
        // Several tool calls can chain in one turn (e.g. presentFact x2-3,
        // getAssessmentProblem, advanceTopic — up to 5 steps by itself), so
        // the cap leaves headroom for a final text-only step rather than
        // risking the loop ending mid-tool-call with no closing message.
        stopWhen: stepCountIs(7),
        onToolExecutionStart: ({ toolCall }) => {
          console.log(`[tool] ${toolCall.toolName} called with`, toolCall.input);
        },
        onToolExecutionEnd: ({ toolCall, toolExecutionMs, toolOutput }) => {
          if (toolOutput.type === "tool-error") {
            console.error(
              `[tool] ${toolCall.toolName} failed after ${toolExecutionMs}ms:`,
              toolOutput.error,
            );
          } else {
            console.log(
              `[tool] ${toolCall.toolName} completed in ${toolExecutionMs}ms:`,
              toolOutput.output,
            );
          }
          // Re-derive the current topic rather than reuse `activeTopic` —
          // a successful advanceTopic call can change it mid-turn.
          const current = innermostTopic(actor.getSnapshot().value);
          if (current !== "syllabusComplete") {
            console.log(`[progress] ${current}:`, actor.getSnapshot().context.topics[current]);
          }
        },
        onEnd: ({ usage, reasoningText }) => {
          console.log(
            `[chat] input tokens: ${usage.inputTokens}, output tokens: ${usage.outputTokens}`,
          );
          console.log(`[chat] reasoning: ${reasoningText ?? "(none)"}`);
        },
      });

      return streamResult;
    },
  );

  after(() => langfuseSpanProcessor.forceFlush());

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("DeepSeek chat request failed:", error);
      return "Something went wrong talking to the tutor.";
    },
  });
}
