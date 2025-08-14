"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, Loader2 } from "lucide-react"

export function CenterIntake({
  title = "Untitled notebook",
  hasSources = false,
  pdfUrl,
  onOpenAdd = () => {},
}: {
  title?: string
  hasSources?: boolean
  pdfUrl?: string
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
          clientId: "c00e026f37cc451aae1ee54adde2fca8",
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
    </Card>
  )
}
