"use client";

import { getAllFileRecords } from "@/lib/idb";
import { emitNewRun } from "@/lib/reportBus";

export async function runModel2WithSelection(selectedText: string): Promise<string> {

  emitNewRun();


  const files = await getAllFileRecords();
  const pdfs = files.filter(f => f.name.toLowerCase().endsWith(".pdf"));

  if (pdfs.length === 0) {
    throw new Error("No PDFs available in Sources");
  }


  const fd = new FormData();
  fd.append("selected_text", selectedText);

  for (const f of pdfs) {
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`Failed to fetch ${f.name}`);
    const blob = await res.blob();
    fd.append("files", new File([blob], f.name, { type: blob.type || "application/pdf" }));
  }


  const resp = await fetch("/api/model2/process", {
    method: "POST",
    body: fd,
  });
  const data = await resp.json();

  if (!resp.ok) {
    const detail = data?.stderr || data?.error || "Model2 processing failed";
    throw new Error(detail);
  }

  return data.outputDirUrl as string; 
}
