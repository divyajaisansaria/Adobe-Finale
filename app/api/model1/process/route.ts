import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPythonCmd() {
  return process.env.PYTHON_PATH || "python";
}

async function saveToTemp(file: File, filenameFallback = "document.pdf") {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "model1-"));
  const filename = (file.name && file.name !== "blob") ? file.name : filenameFallback;
  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  const tmpPath = path.join(tmpDir, safeName);
  await fs.writeFile(tmpPath, buffer);
  return { tmpDir, tmpPath, safeName };
}

function run(cmd: string, args: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      shell: process.platform === "win32", // allow 'py' on Windows
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as unknown as File | null;
    const name = (form.get("name") as string) || "document.pdf";

    if (!file) {
      return NextResponse.json({ error: "missing 'file' form field" }, { status: 400 });
    }

    const { tmpDir, tmpPath, safeName } = await saveToTemp(file, name);

    const publicOut = path.join(process.cwd(), "public", "model1");
    await fs.mkdir(publicOut, { recursive: true });

    const python = getPythonCmd();
    const scriptPath = path.join(process.cwd(), "python", "model_1", "process_pdf.py");

    // 1) sanity check python is callable
    const probe = await run(python, ["--version"]);
    if (probe.code !== 0) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      return NextResponse.json(
        {
          error: "python_not_found",
          stderr: probe.stderr || probe.stdout || `Unable to execute ${python}`,
        },
        { status: 500 }
      );
    }

    // 2) run the script
    const args = [scriptPath, "--input", tmpPath, "--output", publicOut];
    const result = await run(python, args);

    // cleanup temp
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

    if (result.code !== 0) {
      return NextResponse.json(
        { error: "python_failed", stderr: result.stderr || result.stdout },
        { status: 500 }
      );
    }

    // 3) find the saved JSON path from stdout (SAVED_JSON::<path>)
    const line = result.stdout.split(/\r?\n/).find((l) => l.startsWith("SAVED_JSON::"));
    if (!line) {
      const stem = path.parse(safeName).name;
      return NextResponse.json({ publicUrl: `/model1/${stem}.json`, warning: "no_saved_json_marker_found" });
    }
    const fullOutPath = line.replace("SAVED_JSON::", "").trim();
    return NextResponse.json({ publicUrl: `/model1/${path.basename(fullOutPath)}`, ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "unknown_error" }, { status: 500 });
  }
}