import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "edge";

// Function to normalize date to DD-MM-YY format
function normalizeDate(dateString: string): { date: string; needsReview: boolean } {
  if (!dateString || dateString.trim() === '') {
    // Use current date as fallback
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    return {
      date: `${day}-${month}-${year}`,
      needsReview: true
    };
  }

  try {
    const originalDate = dateString.trim();
    console.log('Parsing date:', originalDate);
    
    // Month name mappings
    const monthNames: { [key: string]: number } = {
      'jan': 0, 'january': 0,
      'feb': 1, 'february': 1,
      'mar': 2, 'march': 2,
      'apr': 3, 'april': 3,
      'may': 4,
      'jun': 5, 'june': 5,
      'jul': 6, 'july': 6,
      'aug': 7, 'august': 7,
      'sep': 8, 'september': 8, 'sept': 8,
      'oct': 9, 'october': 9,
      'nov': 10, 'november': 10,
      'dec': 11, 'december': 11
    };
    
    let parsedDate: Date | null = null;
    
    // Pattern 1: DD-MMM-YYYY or DD/MMM/YYYY (e.g., "22-MAY-2025", "22/MAY/2025")
    const monthNamePattern = /^(\d{1,2})[\s\-\/\.]*([a-zA-Z]{3,9})[\s\-\/\.]*(\d{2,4})$/;
    const monthMatch = originalDate.match(monthNamePattern);
    
    if (monthMatch) {
      const [, day, monthStr, year] = monthMatch;
      const monthIndex = monthNames[monthStr.toLowerCase()];
      
      if (monthIndex !== undefined) {
        let fullYear = parseInt(year);
        if (fullYear < 100) {
          // Handle 2-digit years
          const currentYear = new Date().getFullYear();
          const century = Math.floor(currentYear / 100) * 100;
          fullYear = century + fullYear;
        }
        
        parsedDate = new Date(fullYear, monthIndex, parseInt(day));
        console.log('Parsed month name date:', parsedDate);
      }
    }
    
    // Pattern 2: MMM DD, YYYY or MMM DD YYYY (e.g., "MAY 22, 2025", "MAY 22 2025")
    if (!parsedDate) {
      const monthDayYearPattern = /^([a-zA-Z]{3,9})[\s\-\/\.]*(\d{1,2})[\s,]*(\d{2,4})$/;
      const monthDayMatch = originalDate.match(monthDayYearPattern);
      
      if (monthDayMatch) {
        const [, monthStr, day, year] = monthDayMatch;
        const monthIndex = monthNames[monthStr.toLowerCase()];
        
        if (monthIndex !== undefined) {
          let fullYear = parseInt(year);
          if (fullYear < 100) {
            const currentYear = new Date().getFullYear();
            const century = Math.floor(currentYear / 100) * 100;
            fullYear = century + fullYear;
          }
          
          parsedDate = new Date(fullYear, monthIndex, parseInt(day));
          console.log('Parsed month-day-year date:', parsedDate);
        }
      }
    }
    
    // Pattern 3: Numeric formats (existing logic)
    if (!parsedDate) {
      // Clean the input string for numeric parsing
      const cleanedDate = originalDate.replace(/[^\d\/\-\.]/g, '');
      
      // Common numeric patterns
      const patterns = [
        /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
        /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, // DD/MM/YY or MM/DD/YY
        /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, // YYYY/MM/DD
        /^(\d{2})(\d{2})(\d{4})$/, // DDMMYYYY
        /^(\d{2})(\d{2})(\d{2})$/, // DDMMYY
      ];

      for (const pattern of patterns) {
        const match = cleanedDate.match(pattern);
        if (match) {
          const [, part1, part2, part3] = match;
          
          // Try different interpretations
          const interpretations = [];
          
          if (part3.length === 4) { // Full year
            // DD/MM/YYYY
            interpretations.push(new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1)));
            // MM/DD/YYYY
            interpretations.push(new Date(parseInt(part3), parseInt(part1) - 1, parseInt(part2)));
          } else if (part1.length === 4) { // YYYY/MM/DD
            interpretations.push(new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3)));
          } else { // Two digit year
            const currentYear = new Date().getFullYear();
            const century = Math.floor(currentYear / 100) * 100;
            const fullYear = century + parseInt(part3);
            
            // DD/MM/YY
            interpretations.push(new Date(fullYear, parseInt(part2) - 1, parseInt(part1)));
            // MM/DD/YY
            interpretations.push(new Date(fullYear, parseInt(part1) - 1, parseInt(part2)));
          }
          
          // Find the first valid date
          for (const date of interpretations) {
            if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
              parsedDate = date;
              break;
            }
          }
          
          if (parsedDate) break;
        }
      }
    }
    
    // Pattern 4: Try JavaScript's built-in Date parsing as last resort
    if (!parsedDate) {
      try {
        const jsDate = new Date(originalDate);
        if (!isNaN(jsDate.getTime()) && jsDate.getFullYear() > 1900 && jsDate.getFullYear() < 2100) {
          parsedDate = jsDate;
          console.log('Parsed with JS Date:', parsedDate);
        }
      } catch (e) {
        // Ignore JS parsing errors
      }
    }

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const year = String(parsedDate.getFullYear()).slice(-2);
      
      console.log('Successfully parsed date:', `${day}-${month}-${year}`);
      return {
        date: `${day}-${month}-${year}`,
        needsReview: false
      };
    }
  } catch (error) {
    console.error('Date parsing error:', error);
  }

  // If parsing fails, use current date and flag for review
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  
  console.log('Date parsing failed, using current date:', `${day}-${month}-${year}`);
  return {
    date: `${day}-${month}-${year}`,
    needsReview: true
  };
}

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
        4. date - the transaction date (look for any date on the receipt in any format)

        Format your response STRICTLY as a JSON object with these four fields:
        {
          "volume": "extracted volume value (numbers only, no leading zeros)",
          "rate": "extracted rate value (preserve decimal places)",
          "price": "extracted price value (numbers only, no leading zeros)",
          "date": "extracted date in any format found on receipt, or empty string if not found"
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
              { type: "text", text: "Extract the volume, rate, price, and date from this fuel receipt." },
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
        
        // Normalize the date
        const { date: normalizedDate, needsReview } = normalizeDate(jsonResult.date || '');
        
        // Clean up the values if needed
        const cleanedResult = {
          volume: cleanValue(jsonResult.volume),
          rate: jsonResult.rate,
          price: cleanValue(jsonResult.price),
          date: normalizedDate,
          needsReview
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
        4. date - the transaction date (look for any date in the text in any format)

        Format your response STRICTLY as a JSON object with these four fields:
        {
          "volume": "extracted volume value (numbers only, no leading zeros)",
          "rate": "extracted rate value (preserve decimal places)",
          "price": "extracted price value (numbers only, no leading zeros)",
          "date": "extracted date in any format found in text, or empty string if not found"
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
        
        // Normalize the date
        const { date: normalizedDate, needsReview } = normalizeDate(jsonResult.date || '');
        
        // Clean up the values if needed
        const cleanedResult = {
          volume: cleanValue(jsonResult.volume),
          rate: jsonResult.rate,
          price: cleanValue(jsonResult.price),
          date: normalizedDate,
          needsReview
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