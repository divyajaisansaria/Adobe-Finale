"use client"
import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronLeft, Brain, Highlighter, Sparkles, AudioLines } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { FileRecord } from "@/lib/idb"
import SideNavigationIcon from '@/assets/icons/side-navigation.svg';
import PanelCloseIcon from '@/assets/icons/side-navigation.svg';
import SummaryPanel from './SummaryPanel';

type OutlineItem = {
  level: string
  text: string
  page: number
}

// NEW: Define types for the report data
type ReportSection = {
  document: string
  section_title: string
  refined_text: string
}

type ReportFile = {
  source_file: string
  sections: ReportSection[]
}

type NavigationTarget = {
  page: number
  text: string
}
const studioFeatures = [
  { name: "Audio Overview", icon: <AudioLines />, featureKey: "Audio Overview", bgColor: "bg-[#32343d] hover:bg-[#42444d]" },
  { name: "Video Overview", icon: <Sparkles />, featureKey: "Video Overview", bgColor: "bg-[#303632] hover:bg-[#404642]" },
  { name: "Summary", icon: <Brain />, featureKey: "Summary", bgColor: "bg-[#3b3138] hover:bg-[#4b4148]" },
  { name: "Reports", icon: <Highlighter />, featureKey: "Reports", bgColor: "bg-[#3b3b30] hover:bg-[#4b4b40]" },
]

export function StudioPanel({
  selectedFile,
  onNavigateRequest,
}: {
  selectedFile: FileRecord | null
  onNavigateRequest: (target: NavigationTarget) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeFeature, setActiveFeature] = useState<string | null>(null)

  // States for Document Outline
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [isLoadingOutline, setIsLoadingOutline] = useState(false)
  const [outlineError, setOutlineError] = useState<string | null>(null)

  // States for Summary
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // NEW: Add state variables for Reports
  const [reports, setReports] = useState<ReportFile[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [reportsError, setReportsError] = useState<string | null>(null)


  // Outline fetch logic
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

const handleSummary = async () => {
  if (!selectedFile?.url) {
    setSummaryError("⚠️ No PDF URL available.");
    return;
  }

  setIsSummarizing(true);
  setSummary(null);
  setSummaryError(null);

  try {
    const response = await fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfUrl: selectedFile.url }),
    });

    // Use text() to get plain string
    const plainText = await response.text();

    // Directly set the plain text
    setSummary(plainText);
  } catch (err: any) {
    setSummaryError("❌ Error generating summary.");
  } finally {
    setIsSummarizing(false);
  }
};





  // ✅ UPDATED: Polling logic for reports (append as they come; keep loader running under the list)
  const handleFetchReports = async () => {
    setIsLoadingReports(true)
    setReportsError(null)
    setReports([])

    let knownFiles: string[] = []
    let count = 0
    const start = Date.now()

    const poll = async () => {
      try {
        const params = new URLSearchParams({ known: knownFiles.join(",") })
        const res = await fetch(`/api/reports?${params}`)
        if (!res.ok) throw new Error("Failed to fetch reports")
        const data = await res.json()

        if (data.newReports?.length) {
          // Append in arrival order
          setReports(prev => {
            // optional safety: avoid dupes if server races
            const prevJson = JSON.stringify(prev)
            const toAppend = data.newReports.filter((r: ReportFile) => !prevJson.includes(JSON.stringify(r)))
            return toAppend.length ? [...prev, ...toAppend] : prev
          })

          // Remember processed files (first-come-first-print)
          knownFiles = [...knownFiles, ...(data.newFiles || [])]
          count += data.newReports.length
        }

        const elapsed = (Date.now() - start) / 1000
        if (elapsed >= 30 || count >= 3) {
          clearInterval(intervalId)
          setIsLoadingReports(false)
        }
      } catch (err: any) {
        setReportsError(err.message || "Polling error")
        clearInterval(intervalId)
        setIsLoadingReports(false)
      }
    }

    const intervalId = setInterval(poll, 2000)
    poll() // run immediately without waiting first interval
  }

  const handleFeatureClick = (featureKey: string) => {
    setActiveFeature(featureKey);
    if (featureKey === "Summary") handleSummary();
    if (featureKey === "Reports") handleFetchReports();
  }

  const renderScrollableContent = () => {
    const filteredOutline = outline.filter((item) => item.text && item.text.trim().length >= 5)

    // NEW: Reports view — always render list, keep a loader at the bottom while watching
    if (activeFeature === 'Reports') {
      return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {reportsError && (
            <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-red-500">
              <p>⚠️ {reportsError}</p>
            </div>
          )}

          {reports.length === 0 && isLoadingReports && (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Waiting for first output…</span>
            </div>
          )}

          {reports.length > 0 && (
            <>
              {reports.map((report, index) => (
                <div key={index} className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                    {report.source_file}
                  </h3>
                  {report.sections.map((section, secIndex) => (
                    <div key={secIndex} className="bg-muted/20 p-3 rounded-lg text-sm">
                      <h4 className="font-semibold text-muted-foreground mb-1">{section.section_title}</h4>
                      <p className="text-foreground/80 whitespace-pre-wrap">{section.refined_text}</p>
                    </div>
                  ))}
                </div>
              ))}

              {isLoadingReports && (
                <div className="flex items-center justify-start p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Watching for new outputs…</span>
                </div>
              )}
            </>
          )}

          {!isLoadingReports && reports.length === 0 && !reportsError && (
            <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              <p>No reports found. The Python script may not have run yet.</p>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="flex-1 overflow-y-auto p-4">
        {activeFeature === "Summary" && (
          <SummaryPanel
            summary={summary} 
            isSummarizing={isSummarizing}
            summaryError={summaryError}
          />
        )}

        <div>
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

      </div>
    )
  }

  return (
    <Card
      className={`card-hover-glow flex h-full flex-col transition-all duration-300 rounded-2xl
      ${collapsed ? "w-[56px]" : "w-full sm:w-[300px] md:w-[350px] lg:w-[400px]"}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div>
          {!collapsed && activeFeature ? (
            <ChevronLeft
              className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => setActiveFeature(null)}
            />
          ) : (
            !collapsed && <div className="Geist Mono text-xl">Studio</div>
          )}
        </div>
        <div>
          {collapsed ? (
            <SideNavigationIcon
              className="h-6 w-6 cursor-pointer text-neutral-400 hover:text-white"
              onClick={() => setCollapsed(false)}
            />
          ) : (
            <PanelCloseIcon
              className="h-6 w-6 cursor-pointer text-neutral-400 hover:text-white"
              onClick={() => setCollapsed(true)}
            />
          )}
        </div>
      </div>

      {collapsed ? (
        // Collapsed View: Icons with tooltips
        <TooltipProvider delayDuration={0}>
          <div className="mt-2 flex flex-col items-center gap-2 p-2">
            {studioFeatures.map((feature) => (
              <Tooltip key={feature.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 text-white/80 transition-colors ${feature.bgColor}`}
                    onClick={() => {
                      setCollapsed(false)
                      handleFeatureClick(feature.featureKey)
                    }}
                  >
                    {React.cloneElement(feature.icon as React.ReactElement, {
                      className: `h-5 w-5`
                    })}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="border-border bg-popover text-popover-foreground">
                  <p>{feature.name}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      ) : (
        // Expanded View
        <>
          <div className="p-4 border-b border-white/10">
            <div className="grid grid-cols-2 gap-3">
              {studioFeatures.map((feature) => (
                <FeatureTile
                  key={feature.name}
                  icon={feature.icon}
                  label={feature.name}
                  bgColor={feature.bgColor}
                  onClick={() => handleFeatureClick(feature.featureKey)}
                  isActive={activeFeature === feature.featureKey}
                  isLoading={(isSummarizing && feature.featureKey === "Summary") || (isLoadingReports && feature.featureKey === "Reports")}
                />
              ))}
            </div>
          </div>

          {renderScrollableContent()}
        </>
      )}
    </Card>
  )
}

function FeatureTile({
  icon,
  label,
  onClick,
  bgColor,
  isLoading = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  bgColor: string
  isActive?: boolean
  isLoading?: boolean
}) {
  const needsLoadingSpinner = (label === "Summary" || label === "Reports") && isLoading;

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl p-4 flex flex-col gap-2.5 cursor-pointer transition-colors text-white/90 ${bgColor}`}
    >
      {needsLoadingSpinner && (
        <div
          className="absolute inset-0 rounded-xl 
            bg-[conic-gradient(from_0deg,theme(colors.blue.400),theme(colors.purple.500),theme(colors.pink.500),theme(colors.blue.400))] 
            animate-[spin_3s_linear_infinite] 
            opacity-60
            z-10
            pointer-events-none"
        />
      )}

      <div className="relative z-20">
        {React.cloneElement(icon as React.ReactElement, {
          className: `h-5 w-5 text-white/80`
        })}
      </div>

      <span className="relative z-20 text-sm font-medium">{label}</span>
    </div>
  )
}
