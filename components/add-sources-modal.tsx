// AddSourcesModal.tsx

"use client"

import * as React from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UploadCloud, X, Folder, FileText, PlusCircle, Loader2 } from "lucide-react"
import axios from "axios"
import { addFileRecord } from "@/lib/idb" // <<< FIX #2: Correct import
type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUploadComplete: () => void; // <<< CHANGED PROP
};

export function AddSourcesModal({ open, onOpenChange, onUploadComplete }: Props) {
  const [dragOver, setDragOver] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [persona, setPersona] = React.useState("")
  const [jobToBeDone, setJobToBeDone] = React.useState("")
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const resetState = React.useCallback(() => {
    setFiles([])
    setPersona("")
    setJobToBeDone("")
    setDragOver(false)
  }, [])

  function handleOpenChange(isOpen: boolean) {
    if (isUploading) return; // Prevent closing while uploading
    if (!isOpen) {
      resetState()
    }
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
    if (isUploading) return;
    handleFileSelection(e.dataTransfer.files)
  }

  async function uploadFileToCloudinary(file: File): Promise<string> {
    const CLOUDINARY_CLOUD_NAME = "dor5lddjg";
    const CLOUDINARY_UPLOAD_PRESET = "adobe-final";

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await axios.post(url, formData);
    return response.data.secure_url;
  }
  
async function handleSubmit() {
    if (files.length === 0 || !persona.trim() || !jobToBeDone.trim()) {
      alert("Please upload at least one file and fill out all fields.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload all files to Cloudinary to get their URLs
      const uploadPromises = files.map(file => uploadFileToCloudinary(file));
      const fileUrls = await Promise.all(uploadPromises);

      // 2. Create a record for EACH file and add them to IndexedDB
      const addRecordPromises = files.map((file, index) => {
        return addFileRecord({
          persona,
          jobToBeDone,
          name: file.name,
          url: fileUrls[index],
        });
      });
      
      await Promise.all(addRecordPromises);

      // 3. Notify the parent component that the process is done
      onUploadComplete();
      
      resetState();
      onOpenChange(false);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("An error occurred during upload. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby="Upload PDF documents for analysis"
        className="max-w-2xl w-full border-none bg-gray-950/90 text-white shadow-2xl sm:rounded-2xl p-0
                   h-[95vh] md:h-[750px] flex flex-col backdrop-blur-sm"
        onInteractOutside={(e) => {
          if (isUploading) e.preventDefault();
        }}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Folder className="h-6 w-6 text-neutral-400" />
            <div className="text-xl font-semibold">Add Sources</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="persona" className="text-base font-medium">Persona</Label>
              <Input
                id="persona"
                placeholder="e.g., Undergraduate Chemistry Student"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                disabled={isUploading}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 rounded-lg h-11 px-4 focus-visible:ring-sky-500 disabled:opacity-50"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="job-to-be-done" className="text-base font-medium">Job to be Done</Label>
              <Textarea
                id="job-to-be-done"
                placeholder="e.g., Identify key concepts for an exam on reaction kinetics"
                value={jobToBeDone}
                onChange={(e) => setJobToBeDone(e.target.value)}
                disabled={isUploading}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 rounded-lg p-4 min-h-[100px] focus-visible:ring-sky-500 disabled:opacity-50"
              />
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={[
                "rounded-xl border-2 border-dashed p-5 text-center transition-all flex flex-col",
                "min-h-[220px]",
                isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                dragOver ? "border-sky-500 bg-sky-900/40" : "border-gray-700 hover:border-sky-600 bg-gray-900/50",
              ].join(" ")}
              role="button"
              aria-label="Upload PDF files"
            >
              {files.length === 0 ? (
                <div className="m-auto flex flex-col items-center justify-center pointer-events-none p-4">
                  <UploadCloud className="h-12 w-12 text-neutral-500" />
                  <div className="mt-4 text-base font-medium text-neutral-300">Click to upload or drag & drop</div>
                  <p className="mt-2 text-xs text-neutral-500">Supported file type: PDF</p>
                </div>
              ) : (
                <div className="flex flex-col h-full w-full text-left">
                  <div className="mb-3 text-sm font-medium text-neutral-300">Your Documents</div>
                  <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                    {files.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-gray-800/70 p-2.5 rounded-lg">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="h-5 w-5 text-sky-400 flex-shrink-0" />
                          <span className="text-sm text-neutral-200 truncate" title={file.name}>{file.name}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (!isUploading) handleRemoveFile(index); }}
                          disabled={isUploading}
                          className="p-1 rounded-full text-neutral-500 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    disabled={isUploading}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 text-sky-400 px-4 py-2 text-sm font-medium transition-colors hover:bg-sky-900/40 hover:border-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add More Files
                  </button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef} type="file" multiple
              accept="application/pdf,.pdf"
              onChange={(e) => handleFileSelection(e.target.files)}
              className="hidden"
            />
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-end border-t border-gray-800 flex-shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={isUploading || files.length === 0 || !persona.trim() || !jobToBeDone.trim()}
            className="px-8 py-5 text-base rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-[200px] h-[52px]"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              "Upload & Analyze"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}