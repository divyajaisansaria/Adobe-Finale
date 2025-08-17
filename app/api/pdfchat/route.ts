import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { pdfUrl, question } = await req.json();

    if (!pdfUrl || !question) {
      return NextResponse.json({ answer: "" }, { status: 400 });
    }

    const pythonCmd = process.platform === "win32" ? "python" : "python3.11";
    const scriptPath = path.join(process.cwd(), "python", "pdfchat.py");

    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Send input as JSON string via stdin
    pythonProcess.stdin.write(JSON.stringify({ pdfUrl, question }));
    pythonProcess.stdin.end();

    let result = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    const exitCode: number = await new Promise((resolve) => {
      pythonProcess.on("close", resolve);
    });

    if (exitCode !== 0) {
      console.error("Python error:", errorOutput);
      return NextResponse.json(
        { answer: "", error: "Python script failed. See server logs." },
        { status: 500 }
      );
    }

    let answer = "";
    try {
      const parsed = JSON.parse(result);
      answer = parsed.answer || "";
    } catch (err) {
      console.error("Failed to parse Python output:", err, "Raw output:", result);
      return NextResponse.json(
        { answer: "", error: "Failed to parse Python output." },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { answer: "", error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
