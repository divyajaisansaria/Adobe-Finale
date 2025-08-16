//add-sources-modal.tsx
"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UploadCloud, X, Folder, FileText, PlusCircle, Loader2 } from "lucide-react"
import axios from "axios"
import { addFileRecord } from "@/lib/idb"

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUploadComplete: () => void;
};

export function AddSourcesModal({ open, onOpenChange, onUploadComplete }: Props) {
  const [dragOver, setDragOver] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const fileListRef = React.useRef<HTMLDivElement | null>(null);

  const resetState = React.useCallback(() => {
    setFiles([])
    setDragOver(false)
  }, [])

  React.useEffect(() => {
    if (fileListRef.current) {
      fileListRef.current.scrollTop = fileListRef.current.scrollHeight;
    }
  }, [files]);

  function handleOpenChange(isOpen: boolean) {
    if (isUploading) return
    if (!isOpen) resetState()
    onOpenChange(isOpen)
  }

  function filterPDFs(fileList: File[]): File[] {
    const pdfs = fileList.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    )
    if (pdfs.length !== fileList.length) {
      alert("Only PDF files are allowed. Other files have been ignored.")
    }
    return pdfs
  }

  function handleFileSelection(selected: FileList | null) {
    if (!selected) return
    const newPdfs = filterPDFs(Array.from(selected))
    if (newPdfs.length === 0) return
    setFiles((prev) => {
      const combined = [...prev, ...newPdfs]
      return combined.filter(
        (file, index, self) =>
          index === self.findIndex((f) => f.name === file.name && f.size === file.size)
      )
    })
  }

  function handleRemoveFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (isUploading) return
    handleFileSelection(e.dataTransfer.files)
  }

  async function uploadFileToCloudinary(file: File): Promise<string> {
    const CLOUDINARY_CLOUD_NAME = "dor5lddjg"
    const CLOUDINARY_UPLOAD_PRESET = "adobe-final"
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`

    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)

    const response = await axios.post(url, formData)
    return response.data.secure_url
  }

  async function handleSubmit() {
    if (files.length === 0) {
      alert("Please upload at least one PDF file.");
      return;
    }

    setIsUploading(true);
    const successes: { file: File; url: string }[] = [];
    const failures: File[] = [];

    try {
      for (const file of files) {
        try {
          const url = await uploadFileToCloudinary(file);
          successes.push({ file, url });
          await addFileRecord({ name: file.name, url });
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          failures.push(file);
        }
      }

      if (successes.length > 0) {
        alert(`${successes.length} file(s) uploaded successfully.`);
      }

      if (failures.length > 0) {
        alert(`${failures.length} file(s) failed to upload. You can retry them.`);
        setFiles(failures);
      } else {
        resetState();
        onOpenChange(false);
      }

      onUploadComplete();

    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="card-hover-glow  max-w-2xl w-full border-none  p-0 h-[60vh] md:h-[500px] flex flex-col backdrop-blur-sm"
        onInteractOutside={(e) => {
          if (isUploading) e.preventDefault()
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Folder className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
            <DialogTitle className="text-xl font-semibold ">Add Sources</DialogTitle>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={[
              "rounded-xl border-2 border-dashed p-5 text-center transition-all flex flex-col min-h-[220px]",
              isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              dragOver 
                ? "border-sky-500 bg-sky-100 dark:bg-sky-900/40" 
                : "border-gray-300 dark:border-gray-700 hover:border-sky-600 bg-gray-50 dark:bg-gray-900/50",
            ].join(" ")}
            role="button"
            aria-label="Upload PDF files"
          >
            {files.length === 0 ? (
              <div className="m-auto flex flex-col items-center justify-center pointer-events-none p-4">
                <UploadCloud className="h-12 w-12 text-neutral-500" />
                <DialogDescription className="mt-4 text-base font-medium text-neutral-700 dark:text-neutral-300">
                  Click to upload or drag & drop
                  <p className="mt-2 text-xs text-neutral-500">Supported file type: PDF</p>
                </DialogDescription>
              </div>
            ) : (
              <div className="flex flex-col h-full w-full text-left">
                <div className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Your Documents
                </div>
                <div ref={fileListRef} className="flex-1 space-y-2 overflow-y-auto pr-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/70 p-2.5 rounded-lg"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="h-5 w-5 text-sky-500 flex-shrink-0" />
                        <span className="text-sm text-neutral-800 dark:text-neutral-200 truncate" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!isUploading) handleRemoveFile(index) }}
                        disabled={isUploading}
                        className="p-1 rounded-full text-neutral-500 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                  disabled={isUploading}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sky-600 dark:text-sky-400 px-4 py-2 text-sm font-medium transition-colors hover:bg-sky-100 dark:hover:bg-sky-900/40 hover:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add More Files
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            onChange={(e) => handleFileSelection(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={isUploading || files.length === 0}
            className="px-8 py-5 text-base rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-[200px] h-[52px] text-white"
          >
            {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
