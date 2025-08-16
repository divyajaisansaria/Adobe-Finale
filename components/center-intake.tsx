// CenterIntake.tsx
"use client"

import * as React from "react"
import { useEffect, useMemo, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, Loader2 } from "lucide-react"
import { runModel2WithSelection } from "@/lib/model2-client" // ✨ keep

export function CenterIntake({
  title = "Untitled notebook",
  hasSources = false,
  pdfUrl,
  onOpenAdd = () => { },
  navigationTarget,
  onViewerReady,
  onSelectionChange, // ✅ new prop
}: {
  title?: string
  hasSources?: boolean
  pdfUrl?: string
  onOpenAdd?: () => void
  navigationTarget?: { page?: number | string; text?: string } | null
  onViewerReady?: (ready: boolean) => void
  onSelectionChange?: (text: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<any>(null)
  const apisPromiseRef = useRef<Promise<any> | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const selectedTextRef = useRef<string>("")
  const sdkReadyRef = useRef<boolean>(false)
  const currentFileKeyRef = useRef<string>("")
  const isRunningRef = useRef(false)
  const instanceId = useMemo(
    () => `adobe-dc-view-${Math.random().toString(36).slice(2)}`,
    []
  )

  useEffect(() => {
    const markReady = () => { sdkReadyRef.current = true }
    document.addEventListener("adobe_dc_view_sdk.ready", markReady)
    if ((window as any).AdobeDC) markReady()
    return () => {
      document.removeEventListener("adobe_dc_view_sdk.ready", markReady)
    }
  }, [])

  const hardCleanup = React.useCallback(() => {
    viewerRef.current = null
    apisPromiseRef.current = null
    if (containerRef.current) {
      containerRef.current.innerHTML = ""
    }
  }, [])

  useEffect(() => {
    if (!pdfUrl) {
      setIsLoading(false)
      hardCleanup()
      currentFileKeyRef.current = ""
      return
    }
    if (!sdkReadyRef.current) return
    if (currentFileKeyRef.current === pdfUrl) return
    setIsLoading(true)
    hardCleanup()
    currentFileKeyRef.current = pdfUrl

    try {
      const adobeDCView = new (window as any).AdobeDC.View({
        clientId: "c00e026f37cc451aae1ee54adde2fca8",
        divId: instanceId
      })

      const previewPromise = adobeDCView.previewFile(
        {
          content: { location: { url: pdfUrl } },
          metaData: { fileName: title }
        },
        {
          embedMode: "SIZED_CONTAINER",
          defaultViewMode: "FIT_WIDTH",
          showFullScreen: true,
          showDownloadPDF: true,
          enableSearchAPIs: true
        }
      )

      adobeDCView.registerCallback(
        (window as any).AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
        (event: any) => {
          if (event?.type === "PREVIEW_SELECTION_END") {
            previewPromise.then((viewer: any) => {
              viewer.getAPIs().then(async (apis: any) => {
                try {
                  const result = await apis.getSelectedContent()
                  selectedTextRef.current = result?.data ?? ""
                  console.log("selectedText =", selectedTextRef.current)

                  const q = selectedTextRef.current.trim()
                  if (q) {
                    // ✅ Notify parent about the selected text
                    onSelectionChange?.(q)

                    if (!isRunningRef.current) {
                      isRunningRef.current = true
                      try {
                        console.log("Sending selected text to model:", q)
                        const url = await runModel2WithSelection(q)
                        console.log("Model 2 output folder:", url)
                      } finally {
                        isRunningRef.current = false
                      }
                    }
                  }
                } catch (e) {
                  console.warn("Selection event handler error:", e)
                }
              })
            })
          }
        },
        { enableFilePreviewEvents: true }
      )

      previewPromise
        .then((viewer: any) => {
          viewerRef.current = viewer
          apisPromiseRef.current = viewer.getAPIs()
          onViewerReady?.(true)
          setTimeout(() => setIsLoading(false), 0)
        })
        .catch((err: any) => {
          console.error("PDF load error:", err)
          setIsLoading(false)
        })
    } catch (err) {
      console.error("Viewer init error:", err)
      setIsLoading(false)
    }

    return () => {
      hardCleanup()
    }
  }, [pdfUrl, title, instanceId, hardCleanup, onViewerReady])

  // --- Handle navigation & highlight (unchanged) ---
  useEffect(() => {
    if (!navigationTarget || !viewerRef.current || !apisPromiseRef.current) return
    const rawPage = navigationTarget.page
    if (rawPage === undefined || rawPage === null) return
    let n = Number(rawPage)
    if (!Number.isFinite(n)) return
    n = Math.floor(n)
    const targetPage = Math.max(1, n)
    console.log(`Navigating to page ${targetPage} (original input: ${rawPage})`)

    apisPromiseRef.current
      .then(async (apis: any) => {
        await apis.gotoLocation(targetPage)
        if (navigationTarget.text) {
          try {
            await apis.search(navigationTarget.text, { matchCase: false, wholeWord: false })
          } catch (err) {
            console.warn("Highlight failed:", err)
          }
        }
      })
      .catch((err: any) => {
        console.error("Goto location failed:", err)
      })
  }, [navigationTarget])

  return (
    <Card className="glass-card glass-hover flex h-full flex-col rounded-2xl">
      <div className="border-b border-border px-4 py-2">
        <div className="text-sm font-medium text-foreground">{title}</div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {!pdfUrl ? (
          <div className="absolute inset-0 px-6 text-center">
            {!hasSources ? (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 ring-1 ring-border/60">
                  <UploadCloud className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4 text-lg font-medium text-foreground">
                  Add a source to get started
                </div>
                <div className="mt-2">
                  <Button
                    onClick={onOpenAdd}
                    variant="secondary"
                    className="rounded-full"
                  >
                    Upload a source
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-lg font-medium text-muted-foreground">
                  Select a document from the left panel to view it.
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <div id={instanceId} ref={containerRef} className="h-full w-full" />
          </>
        )}
      </div>
    </Card>
  )
}
