import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ facts: [] }, { status: 400 });
    }

    // Cross-platform Python executable
    const pythonCmd = process.platform === "win32" ? "python" : "python3.11";

    // Absolute path to the Python script
    const scriptPath = path.join(process.cwd(), "python", "insightgenerator.py");

    // Spawn Python process
    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Send text via stdin
    pythonProcess.stdin.write(text);
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
        { facts: [], error: "Python script failed. See server logs." },
        { status: 500 }
      );
    }

    // Parse output safely
    let facts = [];
    try {
      facts = JSON.parse(result);
    } catch (err) {
      console.error("Failed to parse Python output:", err, "Raw output:", result);
      return NextResponse.json(
        { facts: [], error: "Failed to parse Python output." },
        { status: 500 }
      );
    }

    return NextResponse.json({ facts });
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { facts: [], error: "Unexpected server error." },
      { status: 500 }
    );
  }
}