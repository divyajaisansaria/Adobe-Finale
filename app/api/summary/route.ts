// app/api/summary/route.ts
import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: Request) {
  try {
    const { pdfUrl } = await req.json()
    if (!pdfUrl) {
      return NextResponse.json({ error: "Missing pdfUrl" }, { status: 400 })
    }

    // Use a valid Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",  // or "gemini-2.5-flash"
    })

    const prompt = `You are an expert AI summarizer. Summarize the content of the PDF located at the following URL. 
Focus on the key points, main ideas, and important details. 
Provide the summary in clear, concise, and easy-to-understand language. 

PDF URL: ${pdfUrl}`;


    const result = await model.generateContent(prompt)
    const summary = result.response.text()

    return NextResponse.json({ summary })
  } catch (err: any) {
    console.error("Summary API error:", err)
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    )
  }
}
