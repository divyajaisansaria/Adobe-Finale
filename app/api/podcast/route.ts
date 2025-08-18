// app/api/podcast/route.ts
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const pythonCmd =
      process.env.PYTHON_PATH || (process.platform === "win32" ? "python" : "python3");
    const scriptPath = path.join(process.cwd(), "python", "generate_podcast.py");

    const child = spawn(pythonCmd, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        // Ensure UTF-8 so we don’t hit encoding issues
        PYTHONIOENCODING: "utf-8",
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    // send input text to python
    child.stdin.write(text);
    child.stdin.end();

    const exitCode: number = await new Promise((resolve) => {
      child.on("close", (code) => resolve(code ?? 0));
    });

    // Always log stderr for debugging, but DO NOT fail just because it exists.
    if (stderr) {
      console.error("[/api/podcast stderr]\n" + stderr);
    }

    if (exitCode !== 0) {
      // Python decided it failed; surface the stderr snippet to help diagnose.
      return NextResponse.json(
        { error: "Python script failed", detail: stderr?.slice(0, 4000) || "no stderr" },
        { status: 500 }
      );
    }

    // The python script prints a single public-relative URL, e.g. "/audio/<file>.mp3"
    const url = (stdout || "").trim().split(/\r?\n/).pop() || "";
    if (!url.startsWith("/audio/")) {
      // Unexpected output; include snippets to help you diagnose
      return NextResponse.json(
        {
          error: "Unexpected python output",
          stdout: stdout.slice(0, 500),
          stderr: stderr.slice(0, 1000),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ audioUrl: url });
  } catch (err: any) {
    console.error("[/api/podcast exception]", err);
    return NextResponse.json(
      { error: "Server error", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
