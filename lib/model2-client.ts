// lib/model2-client.ts
"use client";

import { getAllFileRecords } from "@/lib/idb";
import { emitNewRun } from "@/lib/reportBus";

export async function runModel2WithSelection(selectedText: string): Promise<string> {
  // Signal the UI that a new run starts (ReportsPanel will reset + show loader)
  emitNewRun();

  // 1) Gather ALL PDFs from IndexedDB (your Sources)
  const files = await getAllFileRecords();
  const pdfs = files.filter(f => f.name.toLowerCase().endsWith(".pdf"));

  if (pdfs.length === 0) {
    throw new Error("No PDFs available in Sources");
  }

  // 2) Build multipart form
  const fd = new FormData();
  fd.append("selected_text", selectedText);

  for (const f of pdfs) {
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`Failed to fetch ${f.name}`);
    const blob = await res.blob();
    fd.append("files", new File([blob], f.name, { type: blob.type || "application/pdf" }));
  }

  // 3) Call the API - it will clear outputs and kill any previous run
  const resp = await fetch("/api/model2/process", {
    method: "POST",
    body: fd,
  });
  const data = await resp.json();

  if (!resp.ok) {
    const detail = data?.stderr || data?.error || "Model2 processing failed";
    throw new Error(detail);
  }

  return data.outputDirUrl as string; // e.g. /model2/outputs/
}
