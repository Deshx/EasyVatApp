import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages, model = "gpt-4o" } = await req.json();
  
  const result = await streamText({
    model: openai(model),
    messages: convertToCoreMessages(messages),
    system: "You are a helpful AI assistant that can process text and images",
  });

  return result.toDataStreamResponse();
}
