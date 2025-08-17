// app/api/model2/process/route.ts
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn } from "child_process";
import {
  killCurrentProcess,
  setCurrentChild,
  setRunning,
  setStopped,
} from "@/lib/model2-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPythonCmd() {
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

async function clearOutputsDir(dir: string) {
  // Remove everything, then recreate
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(dir, { recursive: true });
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

    // 0) Public output folder
    const publicOut = path.join(process.cwd(), "public", "model2", "outputs");
    await fs.mkdir(publicOut, { recursive: true });

    // 1) Cancel any existing run *first*
    await killCurrentProcess();

    // 2) Immediately clear output dir so UI never shows stale files
    await clearOutputsDir(publicOut);

    // 3) Create temp INPUT structure: <tmp>/<...>/input.json + PDFs/
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

    // 4) Paths for python + models
    const python = getPythonCmd();
    const scriptPath = path.join(process.cwd(), "python", "model_2", "process_pdf.py");
    const modelDir = path.join(process.cwd(), "python", "model_2", "models");

    // Sanity probe (optional but helpful); quick and non-blocking
    const probe = await new Promise<{ code: number; out: string }>((resolve) => {
      const p = spawn(python, ["--version"], {
        cwd: process.cwd(),
        shell: process.platform === "win32",
        env: { ...process.env, PYTHONNOUSERSITE: "1", PYTHONIOENCODING: "utf-8" },
      });
      let out = "";
      p.stdout.on("data", (d) => (out += d.toString()));
      p.stderr.on("data", (d) => (out += d.toString()));
      p.on("close", (code) => resolve({ code: code ?? 0, out }));
    });
    if (probe.code !== 0) {
      return NextResponse.json({ error: "python_not_found", stderr: probe.out }, { status: 500 });
    }

    // 5) Start run (do NOT await; fire-and-forget)
    const runId = crypto.randomUUID();
    setRunning(runId);

    const args = [scriptPath, inputDir, publicOut, modelDir];
    const child = spawn(python, args, {
      cwd: process.cwd(),
      shell: process.platform === "win32",
      env: {
        ...process.env,
        PYTHONNOUSERSITE: "1",
        PYTHONIOENCODING: "utf-8", // avoid cp1252 Unicode issues on Windows
      },
      // stdio default pipes are okay; we attach logs below
    });

    setCurrentChild(child);

    // Optional logging (async; doesn't block response)
    child.stdout.on("data", (d) => console.log("[model2 stdout]", d.toString().trim()));
    child.stderr.on("data", (d) => console.error("[model2 stderr]", d.toString().trim()));
    child.on("error", (err) => console.error("[model2 spawn error]", err));

    // When the process finishes, mark stopped and clean temp (async, non-blocking)
    child.on("close", async (code) => {
      try {
        setStopped(code ?? 0);
        await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
      } catch {}
    });

    // Allow the child to outlive the HTTP request if needed
    try {
      child.unref?.();
    } catch {}

    // Frontend will poll /api/reports; return immediately
    const outputDirUrl = `/model2/outputs/`;
    return NextResponse.json({ ok: true, runId, outputDirUrl }, { status: 202 });
  } catch (err: any) {
    // If anything throws, ensure we mark stopped (best-effort)
    try {
      setStopped(null);
    } catch {}
    return NextResponse.json({ error: err?.message || "unknown_error" }, { status: 500 });
  }
}
