import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const defaultModel = process.env.MODEL || "gpt-4.1-mini";
  const { messages, model = defaultModel } = await req.json();
  
  // Log the API payload for debugging
  console.log("OpenAI Chat API payload:", {
    model,
    messages,
    system: "You are a helpful AI assistant that can process text and images"
  });
  
  const result = await streamText({
    model: openai(model),
    messages: convertToCoreMessages(messages),
    system: "You are a helpful AI assistant that can process text and images",
  });

  return result.toDataStreamResponse();
}
