import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    // Check if the request contains text or base64Image
    const requestData = await req.json();
    const { text, base64Image } = requestData;
    
    // If neither text nor base64Image is provided, return an error
    if (!text && !base64Image) {
      return NextResponse.json(
        { error: "Either extracted text or image data is required" },
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

    let textToProcess = text;
    
    // If base64Image is provided but no text, first perform OCR
    if (base64Image && !text) {
      // Create the system prompt for OCR + parsing in a single step
      const systemPrompt = `
        You are a fuel receipt parser specializing in extracting structured data from gas station receipts.
        From the provided receipt image, extract ONLY the following information:
        1. volume - the volume in liters (look for "Volume(L)" or similar)
        2. rate - the price per liter (look for "Rate(Rs/L)" or similar)
        3. price - the total amount paid (look for "Amount(Rs)" or similar)

        Format your response STRICTLY as a JSON object with these three fields:
        {
          "volume": "extracted volume value (numbers only, no leading zeros)",
          "rate": "extracted rate value (preserve decimal places)",
          "price": "extracted price value (numbers only, no leading zeros)"
        }
        
        Return only valid JSON, no explanations or additional text.
      `;

      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the volume, rate, and price from this fuel receipt." },
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
        response_format: { type: "json_object" }
      });

      const parsedContent = response.choices[0].message.content;
      
      try {
        // Ensure the response is valid JSON
        const jsonResult = JSON.parse(parsedContent || "{}");
        
        // Clean up the values if needed
        const cleanedResult = {
          volume: cleanValue(jsonResult.volume),
          rate: jsonResult.rate,
          price: cleanValue(jsonResult.price)
        };
        
        return NextResponse.json(cleanedResult);
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        return NextResponse.json(
          { error: "Failed to parse receipt data" },
          { status: 500 }
        );
      }
    } else {
      // If text is provided, use the existing flow to parse it
      // Create the system prompt that instructs the AI how to parse the receipt
      const systemPrompt = `
        You are a fuel receipt parser specializing in extracting structured data from gas station receipts.
        From the provided receipt text, extract ONLY the following information:
        1. volume - the volume in liters (look for "Volume(L)" or similar)
        2. rate - the price per liter (look for "Rate(Rs/L)" or similar)
        3. price - the total amount paid (look for "Amount(Rs)" or similar)

        Format your response STRICTLY as a JSON object with these three fields:
        {
          "volume": "extracted volume value (numbers only, no leading zeros)",
          "rate": "extracted rate value (preserve decimal places)",
          "price": "extracted price value (numbers only, no leading zeros)"
        }
        
        Return only valid JSON, no explanations or additional text.
      `;

      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" }
      });

      const parsedContent = response.choices[0].message.content;
      
      try {
        // Ensure the response is valid JSON
        const jsonResult = JSON.parse(parsedContent || "{}");
        
        // Clean up the values if needed
        const cleanedResult = {
          volume: cleanValue(jsonResult.volume),
          rate: jsonResult.rate,
          price: cleanValue(jsonResult.price)
        };
        
        return NextResponse.json(cleanedResult);
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        return NextResponse.json(
          { error: "Failed to parse receipt data" },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// Function to clean up values (remove leading zeros)
function cleanValue(value: string): string {
  if (!value) return value;
  
  // Handle the case where we have something like "00003.65"
  if (value.includes('.')) {
    const [whole, decimal] = value.split('.');
    return parseFloat(`${parseInt(whole)}.${decimal}`).toString();
  }
  
  // If no decimal, just remove leading zeros
  return parseInt(value).toString();
} 