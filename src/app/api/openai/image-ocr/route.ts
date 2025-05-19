import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { base64Image, prompt = "Extract the text in the image" } = await req.json();
    
    if (!base64Image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: base64Image,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2048,
    });

    const extractedText = response.choices[0].message.content;
    
    return NextResponse.json({ text: extractedText });
  } catch (error) {
    console.error("Error processing image:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
} 