// app/api/podcast/route.ts
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const pyProcess = spawn("python3", ["python/generate_podcast.py"]);

    let result = "";
    let error = "";

    pyProcess.stdout.on("data", (data) => (result += data.toString()));
    pyProcess.stderr.on("data", (data) => (error += data.toString()));

    pyProcess.stdin.write(text);
    pyProcess.stdin.end();

    return await new Promise((resolve) => {
      pyProcess.on("close", () => {
        if (error) {
          console.error(error);
          resolve(
            NextResponse.json({ error: "Python script failed" }, { status: 500 })
          );
        } else {
          resolve(NextResponse.json({ audioUrl: result.trim() }));
        }
      });
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
