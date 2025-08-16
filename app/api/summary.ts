// app/api/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";

// Initialize Gemini AI client with API key from env
const genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Parse JSON from frontend
    const { pdfUrl } = await req.json();
    if (!pdfUrl) {
      return NextResponse.json({ error: "Missing PDF URL" }, { status: 400 });
    }

    // 2️⃣ Fetch PDF from URL
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error("Failed to fetch PDF from URL");
    }
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    // 3️⃣ Extract text from PDF
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error("PDF contains no readable text");
    }

    console.log("===== PDF Parsed Text Start =====");
    console.log(pdfText.slice(0, 500)); // log first 500 chars only
    console.log("===== PDF Parsed Text End =====");

    // 4️⃣ Prepare prompt for Gemini
    const prompt = `
You are an expert AI summarizer. Summarize the following PDF content.

Instructions:
- Use bold markdown headings (e.g., **Main Purpose**, **Key Findings**, **Challenges**, **Recommendations**).
- Under each heading, list key points as separate lines (each line will become a bullet point in frontend).
- Keep sentences concise; each key point should be one line.
- Use double newlines between sections.
- Focus on main points, structure, and insights.

PDF Content:
${pdfText}
`;

    // 5️⃣ Generate summary using Gemini
    const result = await genAI.generateText({
      model: "gemini-1.5-pro",
      prompt,
    });

    const summary = result.outputText;

    // 6️⃣ Return summary to frontend
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate summary" },
      { status: 500 }
    );
  }
}
