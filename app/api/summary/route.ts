import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { pdfUrl } = await req.json();
    if (!pdfUrl) {
      return NextResponse.json({ summary: "PDF URL not provided." }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), "python", "summarygenerator.py");
    const pythonCmd =
      process.env.PYTHON_PATH || (process.platform === "win32" ? "python" : "python3");

    const summary: string = await new Promise((resolve, reject) => {
      const pyProcess = spawn(pythonCmd, [scriptPath, pdfUrl], {
        env: process.env,
      });

      let stdout = "";
      let stderr = "";
      pyProcess.stdout.on("data", (d) => (stdout += d.toString()));
      pyProcess.stderr.on("data", (d) => (stderr += d.toString()));

      pyProcess.on("close", (code) => {
        if (code !== 0) return reject(new Error(stderr || "Python process failed"));
        resolve(stdout.trim());
      });
    });

    return new Response(summary, { headers: { "Content-Type": "text/plain" } });
  } catch (err: any) {
    return NextResponse.json(
      { summary: `Error: ${err.message || "Failed to generate summary."}` },
      { status: 500 }
    );
  }
}
