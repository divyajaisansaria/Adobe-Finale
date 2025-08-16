"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, FileAudio2, FileText, BrainCircuit, FileVideo2, ChevronLeft } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { FileRecord } from "@/lib/idb"
import SideNavigationIcon from '@/assets/icons/side-navigation.svg';
import PanelCloseIcon from '@/assets/icons/side-navigation.svg';

type OutlineItem = {
  level: string
  text: string
  page: number
}

type NavigationTarget = {
  page: number
  text: string
}

const studioFeatures = [
  { name: "Audio Overview", icon: <FileAudio2 />, featureKey: "Audio Overview" },
  { name: "Video Overview", icon: <FileVideo2 />, featureKey: "Video Overview" },
  { name: "Summary", icon: <BrainCircuit />, featureKey: "Summary" },
  { name: "Reports", icon: <FileText />, featureKey: "Reports" },
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
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [isLoadingOutline, setIsLoadingOutline] = useState(false)
  const [outlineError, setOutlineError] = useState<string | null>(null)

  const [summary, setSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

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
      setSummaryError("⚠️ No PDF URL available.")
      return
    }

    setIsSummarizing(true)
    setSummary("")
    setSummaryError(null)

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: selectedFile.url }),
      })

      const data = await response.json()
      setSummary(data.summary || "⚠️ No summary generated.")
    } catch (err: any) {
      setSummaryError("❌ Error generating summary.")
    } finally {
      setIsSummarizing(false)
    }
  }

  // Render content
  const renderStudioContent = () => {
    const filteredOutline = outline.filter((item) => item.text && item.text.trim().length >= 5)

    return (
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Feature tiles */}
        <div className="grid grid-cols-2 gap-3">
          {studioFeatures.map((feature) => (
            <FeatureTile
              key={feature.name}
              icon={feature.icon}
              label={feature.name}
              onClick={() => {
                setActiveFeature(feature.featureKey)
                if (feature.featureKey === "Summary") handleSummary()
              }}
              isActive={activeFeature === feature.featureKey}
              isLoading={isSummarizing && activeFeature === "Summary"}
            />
          ))}
        </div>

        {/* Conditional Summary / Outline Section */}
        {activeFeature === "Summary" ? (
          <div className="mt-6">
            {summaryError && (
              <p className="mt-3 text-sm text-red-500">{summaryError}</p>
            )}

            <div className="mt-4 text-sm text-foreground">
              {isSummarizing ? (
                <p>Generating summary, please wait...</p>
              ) : summary ? (
                <div className="space-y-4">
                  {summary
                    .split("\n\n") // split by paragraphs or double newlines
                    .map((paragraph, idx) => {
                      // Extract heading if present
                      const headingMatch = paragraph.match(/\*\*(.+?)\*\*/);
                      const heading = headingMatch ? headingMatch[1] : null;

                      // Remove markdown bold from text
                      const text = paragraph.replace(/\*\*(.+?)\*\*/g, "").trim();

                      // Split sentences or lines into bullets
                      const bullets = text
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0);

                      return (
                        <div key={idx}>
                          {heading && <h4 className="font-semibold mb-1">{heading}</h4>}
                          {bullets.length > 0 && (
                            <ul className="list-disc list-inside space-y-1">
                              {bullets.map((bullet, i) => (
                                <li key={i}>{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p>Summary will appear here automatically.</p>
              )}
            </div>

          </div>
        ) : (
          <div className="mt-8">
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
        )}
      </div>
    )
  }

  return (
    <Card
      className={`card-hover-glow flex h-full flex-col transition-all duration-300 rounded-2xl
      ${collapsed ? "w-[56px]" : "w-full sm:w-[300px] md:w-[350px] lg:w-[400px]"}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        {/* Left side: Studio text or back icon */}
        <div>
          {!collapsed && activeFeature === "Summary" ? (
            <ChevronLeft
              className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => setActiveFeature(null)}
            />
          ) : (
            !collapsed && <div className="Geist Mono text-xl">Studio</div>
          )}
        </div>

        {/* Right side: Collapse/Expand button */}
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
        <TooltipProvider delayDuration={0}>
          <div className="mt-2 flex flex-col items-center gap-2 p-2">
            {studioFeatures.map((feature) => (
              <Tooltip key={feature.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setCollapsed(false)
                      setActiveFeature(feature.featureKey)
                      if (feature.featureKey === "Summary") handleSummary()
                    }}
                  >
                    {React.cloneElement(feature.icon, { className: "h-5 w-5" })}
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
        renderStudioContent()
      )}
    </Card>
  )
}

function FeatureTile({
  icon,
  label,
  onClick,
  isActive = false,
  isLoading = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  isActive?: boolean
  isLoading?: boolean
}) {
  const isSummaryTile = label === "Summary";

  return (
    <div onClick={onClick} className="relative rounded-xl p-[2px] overflow-hidden">
      {/* Neon border layer */}
      {isSummaryTile && isLoading && (
        <div
          className="absolute inset-0 rounded-xl 
            bg-[conic-gradient(from_0deg,theme(colors.blue.400),theme(colors.purple.500),theme(colors.pink.500),theme(colors.blue.400))] 
            animate-[spin_3s_linear_infinite] 
            opacity-60
            z-10
            pointer-events-none"
        />
      )}
      {/* Inner tile content */}
      <div className="relative rounded-xl bg-card/80 p-4 flex items-center gap-3 text-sm z-20">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/90 text-secondary-foreground ring-1 ring-border/60">
          {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
        </div>
        <span className="truncate">{label}</span>
      </div>
    </div>
  )
}
