import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { base64Image, prompt } = await req.json();
    
    if (!base64Image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.MODEL || "gpt-4.1-mini";
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    // Create the OpenAI payload
    const openaiPayload = {
      model,
      messages: [
        {
          role: "system",
          content: "You are a receipt OCR system. Extract ONLY the raw text from the image. DO NOT add any commentary, formatting, code blocks, or phrases like 'The text on the receipt is'. Return ONLY the raw text content."
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt || "Extract all text from this image exactly as it appears." },
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
    };
    
    // Log the payload (without the base64 image for readability)
    console.log("OpenAI API payload:", {
      ...openaiPayload,
      messages: [
        openaiPayload.messages[0],
        {
          ...openaiPayload.messages[1],
          content: [
            openaiPayload.messages[1].content[0],
            { 
              type: "image_url", 
              image_url: { 
                url: base64Image.substring(0, 50) + "...[truncated]", 
                detail: "high" 
              } 
            }
          ]
        }
      ]
    });

    const response = await openai.chat.completions.create(openaiPayload);

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