import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || text.trim() === "") {
      return NextResponse.json({ facts: [] }, { status: 400 });
    }

    const pythonCmd =
      process.env.PYTHON_PATH || (process.platform === "win32" ? "python" : "python3");
    const scriptPath = path.join(process.cwd(), "python", "insightgenerator.py");

    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env, // make env explicit
    });

    pythonProcess.stdin.write(text);
    pythonProcess.stdin.end();

    let result = "";
    let errorOutput = "";
    pythonProcess.stdout.on("data", (d) => (result += d.toString()));
    pythonProcess.stderr.on("data", (d) => (errorOutput += d.toString()));

    const exitCode: number = await new Promise((resolve) => {
      pythonProcess.on("close", resolve);
    });

    if (exitCode !== 0) {
      console.error("Python error:", errorOutput);
      return NextResponse.json({ facts: [], error: "Python script failed. See server logs." }, { status: 500 });
    }

    let facts = [];
    try {
      facts = JSON.parse(result);
    } catch (err) {
      console.error("Failed to parse Python output:", err, "Raw output:", result);
      return NextResponse.json({ facts: [], error: "Failed to parse Python output." }, { status: 500 });
    }

    return NextResponse.json({ facts });
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json({ facts: [], error: "Unexpected server error." }, { status: 500 });
  }
}
