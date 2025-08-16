import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface Fact {
  id: string;
  title: string;
  content: string;
  category: string;
  confidence: number;
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ facts: [] }, { status: 400 });
    }

    const prompt = `
      You are an AI assistant. Generate 3 concise and insightful "Did You Know" facts based on the following text.
      Return the response strictly as a JSON array with objects containing:
      id (string), title (string), content (string), category (string), confidence (0-1 float).

      Text:
      """${text}"""
    `;

    const response = await genAI.generateContent({
      model: "models/gemini-2.5-flash",
      contents: prompt,
      temperature: 0.7,
      maxOutputTokens: 500,
    });

    let facts: Fact[] = [];
    try {
      facts = JSON.parse(response.text) as Fact[];
    } catch (err) {
      console.error("Failed to parse Gemini response:", err);
      facts = [];
    }

    return NextResponse.json({ facts });
  } catch (error) {
    console.error("Error generating insights:", error);
    return NextResponse.json({ facts: [] }, { status: 500 });
  }
}
