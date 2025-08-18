"use client";
// lib/model1-client.ts

// lib/model1-client.ts
export async function runModel1OnUrl(url: string, name: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("failed to fetch selected PDF");
  const blob = await res.blob();

  const fd = new FormData();
  fd.append("file", new File([blob], name || "document.pdf", { type: blob.type || "application/pdf" }));
  fd.append("name", name || "document.pdf");

  const api = await fetch("/api/model1/process", { method: "POST", body: fd });
  const data = await api.json();

  if (!api.ok) {
    // ⬇️ Show full stderr in the thrown error so you can read it in the console
    const detail = data?.stderr || data?.error || "Model1 processing failed";
    throw new Error(detail);
  }

  return data.publicUrl as string; // e.g. /model1/<stem>.json
}
