// app/api/summary/route.ts
import { NextResponse } from "next/server"
import { execFile } from "child_process"
import path from "path"

export async function POST(req: Request) {
  try {
    const { pdfUrl } = await req.json()
    if (!pdfUrl) {
      return NextResponse.json({ error: "Missing pdfUrl" }, { status: 400 })
    }

    // Path to your Python script
    const scriptPath = path.join(process.cwd(), "python_scripts", "summarygenerator.py")

    // Call Python 3.11
    const summary: string = await new Promise((resolve, reject) => {
      execFile(
        "python3.11",
        [scriptPath, pdfUrl], // pass pdfUrl as argument
        { encoding: "utf-8" },
        (error, stdout, stderr) => {
          if (error) {
            console.error("Python error:", stderr)
            return reject(error)
          }
          resolve(stdout.trim())
        }
      )
    })

    return NextResponse.json({ summary })
  } catch (err: any) {
    console.error("Summary API error:", err)
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    )
  }
}
