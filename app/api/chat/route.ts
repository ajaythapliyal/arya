import { deepSeek } from "@ai-sdk/deepseek";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { ARYA_INSTRUCTIONS } from "@/lib/arya-instructions";

export async function POST(req: Request) {
  const body = await req.json();
  const messages = body?.messages as UIMessage[] | undefined;

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "Request body must include a non-empty `messages` array." },
      { status: 400 },
    );
  }

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

  const result = streamText({
    model: deepSeek("deepseek-flash"),
    instructions: ARYA_INSTRUCTIONS,
    messages: modelMessages,
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("DeepSeek chat request failed:", error);
      return "Something went wrong talking to the tutor.";
    },
  });
}
