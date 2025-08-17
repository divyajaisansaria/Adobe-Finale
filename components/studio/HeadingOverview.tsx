"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { FileRecord } from "@/lib/idb"
import type { OutlineItem, NavigationTarget } from "./types"

export function HeadingOverview({
  selectedFile,
  onNavigateRequest,
}: {
  selectedFile: FileRecord | null
  onNavigateRequest: (target: NavigationTarget) => void
}) {
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [isLoadingOutline, setIsLoadingOutline] = useState(false)
  const [outlineError, setOutlineError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedFile) {
      setOutline([])
      setOutlineError(null)
      return
    }

    const pollForOutline = async (filename: string, maxRetries: number, delay: number) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const res = await fetch(`/api/outline/${encodeURIComponent(filename)}`)
          if (res.ok) {
            const data = await res.json()
            setOutline(data.outline || [])
            setIsLoadingOutline(false)
            return
          }
          if (res.status !== 404) throw new Error(`Server error: ${res.status}`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        } catch (err: any) {
          setOutlineError(err.message)
          setIsLoadingOutline(false)
          return
        }
      }
      setOutlineError("Nothing to be shown here.")
      setIsLoadingOutline(false)
    }

    setIsLoadingOutline(true)
    setOutlineError(null)
    setOutline([])

    const jsonFilename = selectedFile.name
      .replace(/\.pdf$/i, ".json")
      .replace(/[^\w.\-]+/g, "_")

    pollForOutline(jsonFilename, 20, 500)
  }, [selectedFile])

  const handleGoToPage = (pageNumber: number, text: string) => {
    onNavigateRequest({ page: pageNumber + 1, text })
  }

  const filteredOutline = outline.filter((item) => item.text && item.text.trim().length >= 5)

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {isLoadingOutline ? (
        <div className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : outlineError ? (
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <p>{outlineError}</p>
        </div>
      ) : filteredOutline.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="mb-2 px-2 text-md font-semibold text-muted-foreground">Document Outline</h3>
          {filteredOutline.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              className="h-auto w-full justify-start text-left text-foreground hover:bg-accent hover:text-accent-foreground"
              style={{ paddingLeft: `${parseInt(item.level.substring(1)) * 0.75}rem` }}
              onClick={() => handleGoToPage(item.page, item.text)}
            >
              <span className="truncate">{item.text}</span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
