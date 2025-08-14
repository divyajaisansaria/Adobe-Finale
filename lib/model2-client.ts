"use client";

import { getAllFileRecords } from "@/lib/idb";

export async function runModel2WithSelection(selectedText: string): Promise<string> {
  // 1) Gather ALL PDFs from IndexedDB (your Sources)
  const files = await getAllFileRecords();
  const pdfs = files.filter(f => f.name.toLowerCase().endsWith(".pdf"));

  if (pdfs.length === 0) {
    throw new Error("No PDFs available in Sources");
  }

  // 2) Build multipart form
  const fd = new FormData();
  fd.append("selected_text", selectedText);

  // Attach each PDF as a proper File for the server
  for (const f of pdfs) {
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`Failed to fetch ${f.name}`);
    const blob = await res.blob();
    fd.append("files", new File([blob], f.name, { type: blob.type || "application/pdf" }));
  }

  // 3) Call the API
  const resp = await fetch("/api/model2/process", {
    method: "POST",
    body: fd,
  });
  const data = await resp.json();

  if (!resp.ok) {
    const detail = data?.stderr || data?.error || "Model2 processing failed";
    throw new Error(detail);
  }

  // Returns something like: /models_2/<runId>/
  return data.outputDirUrl as string;
}
