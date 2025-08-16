import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPythonCmd() {
  // you already set this in .env.local for Model 1
  // e.g. PYTHON_PATH=.venv\Scripts\python.exe
  return process.env.PYTHON_PATH || "python";
}

function sanitize(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

async function writeFileSafe(p: string, buf: Buffer) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, buf);
}

async function mktemp(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

function run(cmd: string, args: string[]) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      shell: process.platform === "win32",
      env: { ...process.env, PYTHONNOUSERSITE: "1" },
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

    // selected text from the viewer
    const selectedText = (form.get("selected_text") as string | null) || "";
    if (!selectedText.trim()) {
      return NextResponse.json({ error: "missing selected_text" }, { status: 400 });
    }

    // collect all uploaded PDFs (multiple 'files' fields)
    const pdfFiles: File[] = [];
    for (const [k, v] of form.entries()) {
      if (k === "files" && v instanceof File) pdfFiles.push(v);
    }
    if (pdfFiles.length === 0) {
      return NextResponse.json({ error: "no pdf files provided" }, { status: 400 });
    }

    // 1) Create temp INPUT structure: <tmp>/<...>/input.json + PDFs/
    const tmpRoot = await mktemp("model2");
    const inputDir = path.join(tmpRoot, "input");
    const pdfsDir = path.join(inputDir, "PDFs");
    await fs.mkdir(pdfsDir, { recursive: true });

    for (const f of pdfFiles) {
      const ab = await f.arrayBuffer();
      const buf = Buffer.from(ab);
      const safe = sanitize(f.name || "document.pdf");
      await writeFileSafe(path.join(pdfsDir, safe), buf);
    }

    const inputJson = {
      persona: { role: "user" },
      job_to_be_done: { task: "recommend" },
      query: { selected_text: selectedText },
      filters: {},
    };
    await writeFileSafe(
      path.join(inputDir, "input.json"),
      Buffer.from(JSON.stringify(inputJson, null, 2), "utf8")
    );

    // 2) Always use a fixed public output folder: public/model2/outputs
    const publicOut = path.join(process.cwd(), "public", "model2", "outputs");
    await fs.mkdir(publicOut, { recursive: true });

    

    // 3) Paths for python + models
    const python = getPythonCmd();
    const scriptPath = path.join(process.cwd(), "python", "model_2", "process_pdf.py");
    const modelDir = path.join(process.cwd(), "python", "model_2", "models");

    // (optional) sanity check python
    const probe = await run(python, ["--version"]);
    if (probe.code !== 0) {
      await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      return NextResponse.json(
        { error: "python_not_found", stderr: probe.stderr || probe.stdout },
        { status: 500 }
      );
    }

    // 4) Run model 2
    const args = [scriptPath, inputDir, publicOut, modelDir];
    const result = await run(python, args);

    // Clean temp
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});

    if (result.code !== 0) {
      return NextResponse.json(
        { error: "python_failed", stderr: result.stderr || result.stdout },
        { status: 500 }
      );
    }

    // 5) Parse the SAVED_DIR marker (added in step 1)
    const line = result.stdout.split(/\r?\n/).find((l) => l.startsWith("SAVED_DIR::"));
    const dirPath = line ? line.replace("SAVED_DIR::", "").trim() : publicOut;

    const outputDirUrl = `/model2/outputs/`;
    return NextResponse.json({ ok: true, outputDirUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "unknown_error" }, { status: 500 });
  }
}
