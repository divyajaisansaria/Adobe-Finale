"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UploadCloud, Loader2 } from "lucide-react"

export function CenterIntake({
  title = "Untitled notebook",
  hasSources = false,
  pdfUrl,
  persona = "",
  job = "",
  onPersonaChange = () => {},
  onJobChange = () => {},
  onOpenAdd = () => {},
}: {
  title?: string
  hasSources?: boolean
  pdfUrl?: string
  persona?: string
  job?: string
  onPersonaChange?: (v: string) => void
  onJobChange?: (v: string) => void
  onOpenAdd?: () => void
}) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const container = viewerRef.current;
    if (pdfUrl && container) {
      const renderPdf = () => {
        if (typeof (window as any).AdobeDC === 'undefined') {
          console.warn("Adobe DC View SDK not ready.");
          return;
        }

        const adobeDCView = new (window as any).AdobeDC.View({
          clientId: "c00e026f37cc451aae1ee54adde2fca8", // Your Client ID
          divId: container.id,
        });

        adobeDCView.previewFile(
          {
            content: { location: { url: pdfUrl } },
            metaData: { fileName: title },
          },
          {
            embedMode: "SIZED_CONTAINER",
            defaultViewMode: "FIT_WIDTH",
            showFullScreen: true,
            showDownloadPDF: true,
          }
        );
        setIsLoading(false);
      };

      document.addEventListener("adobe_dc_view_sdk.ready", renderPdf);
      if (typeof (window as any).AdobeDC !== 'undefined') {
        renderPdf();
      }

      return () => {
        document.removeEventListener("adobe_dc_view_sdk.ready", renderPdf);
      };
    } else {
      setIsLoading(false);
    }
  }, [pdfUrl, title]);

  return (
    <Card className="flex h-full flex-col border-white/10 bg-[rgb(27,29,31)]">
      <div className="border-b border-white/10 px-4 py-2">
        <div className="text-sm font-medium text-neutral-200">{title}</div>
      </div>

      {/* --- THE FIX IS HERE --- */}
      {/* Adding `overflow-hidden` allows the `flex-1` container to correctly calculate its height,
          which in turn allows the `h-full` PDF viewer inside it to expand properly. */}
      <div className="flex-1 relative overflow-hidden">
        {!pdfUrl ? (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6">
            {!hasSources ? (
              <div>
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/8">
                  <UploadCloud className="h-5 w-5 text-neutral-300" />
                </div>
                <div className="mt-4 text-lg font-medium text-neutral-200">Add a source to get started</div>
                <div className="mt-2">
                  <Button
                    onClick={onOpenAdd}
                    variant="secondary"
                    className="rounded-full border-white/15 bg-white/5 px-4 py-2 text-[13px] text-neutral-200 hover:bg-white/10"
                  >
                    Upload a source
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-lg font-medium text-neutral-400">
                Select a document from the left panel to view it.
              </div>
            )}
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
              </div>
            )}
            <div id="adobe-dc-view" ref={viewerRef} className="h-full w-full" />
          </>
        )}
      </div>

      <div className="grid w-full gap-3 px-4 py-4 md:grid-cols-2 border-t border-white/10">
        <div className="grid gap-1.5">
          <Label htmlFor="persona" className="text-xs text-neutral-300">
            Persona
          </Label>
          <Input
            id="persona"
            value={persona}
            onChange={(e) => onPersonaChange(e.target.value)}
            placeholder="e.g., Undergraduate Chemistry Student"
            className="border-white/10 bg-[rgb(23,24,26)] text-sm text-neutral-200 placeholder:text-neutral-500"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="job" className="text-xs text-neutral-300">
            Job to be done
          </Label>
          <Input
            id="job"
            value={job}
            onChange={(e) => onJobChange(e.target.value)}
            placeholder="e.g., Identify key concepts for reaction kinetics exam"
            className="border-white/10 bg-[rgb(23,24,26)] text-sm text-neutral-200 placeholder:text-neutral-500"
          />
        </div>
      </div>
    </Card>
  )
}