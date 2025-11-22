import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ADOBE_CATEGORIES } from "../types";

// Ensure API key is present
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY_FOR_BUILD' });

const batchResponseSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: "The exact ID provided in the input for this image.",
      },
      title: {
        type: Type.STRING,
        description: "A descriptive, concise English title (must be between 7 and 10 words).",
      },
      keywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "20-30 single-word English keywords. No phrases.",
      },
      category: {
        type: Type.STRING,
        enum: ADOBE_CATEGORIES,
        description: "The most appropriate Adobe Stock category.",
      }
    },
    required: ["id", "title", "keywords", "category"],
  }
};

export interface BatchInput {
  id: string;
  prompt: string;
}

export interface BatchResult {
  id: string;
  title: string;
  keywords: string;
  category: string;
}

export const generateMetadataBatch = async (
  inputs: BatchInput[]
): Promise<BatchResult[]> => {
  if (!apiKey) throw new Error("API Key not found");
  if (inputs.length === 0) return [];

  try {
    const promptContent = `
      You are an expert Adobe Stock metadata specialist. 
      Process the following list of ${inputs.length} image descriptions.
      
      For EACH item in the list:
      1. Generate a professional English Title (7-10 words long).
      2. Generate 20-30 relevant English Keywords (single words only).
      3. Select the best Category from the allowed list.
      4. Return the result linked to its specific ID.

      Input List:
      ${JSON.stringify(inputs.map(i => ({ id: i.id, description: i.prompt })), null, 2)}
    `;

    // Create a timeout promise to prevent hanging requests
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 45000)
    );

    const apiCall = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptContent,
      config: {
        responseMimeType: "application/json",
        responseSchema: batchResponseSchema,
        temperature: 0.3,
      },
    });

    // Race between the API call and the timeout
    const response = await Promise.race([apiCall, timeoutPromise]) as any;

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const data = JSON.parse(text) as any[];

    // Map and validate results
    return data.map(item => ({
      id: item.id,
      title: item.title || "Untitled",
      keywords: Array.isArray(item.keywords) ? item.keywords.join(",") : String(item.keywords),
      category: item.category || "Graphic Resources",
    }));

  } catch (error) {
    console.error("Gemini Batch API Error:", error);
    throw error;
  }
};