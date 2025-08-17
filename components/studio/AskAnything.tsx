"use client"

import * as React from "react"
import PdfChat from "@/components/PdfChat" // adjust if your PdfChat path differs

export function AskAnything({ pdfUrl }: { pdfUrl?: string }) {
  if (!pdfUrl) {
    return (
      <div className="flex-1 overflow-y-auto p-4 text-sm text-muted-foreground">
        Select a PDF to start asking questions.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <PdfChat pdfUrl={pdfUrl} />
    </div>
  )
}
