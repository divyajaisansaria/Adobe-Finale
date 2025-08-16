import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({ facts: [] }, { status: 400 });
    }

    // Spawn Python process
    // If insightgenerator.py is in ./python folder
const pythonProcess = spawn("python3.11", ["./python/insightgenerator.py"]);


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
      return NextResponse.json({ facts: [] }, { status: 500 });
    }

    let facts = [];
    try {
      facts = JSON.parse(result);
    } catch (err) {
      console.error("Failed to parse Python output:", err);
      facts = [];
    }

    return NextResponse.json({ facts });
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json({ facts: [] }, { status: 500 });
  }
}
