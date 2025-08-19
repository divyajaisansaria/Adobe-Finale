"use client"

import * as React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Brain, Highlighter, Sparkles, AudioLines } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type { FileRecord } from "@/lib/idb"
import type { NavigationTarget } from "./types"

import SideNavigationIcon from "@/assets/icons/side-navigation.svg"
import PanelCloseIcon from "@/assets/icons/side-navigation.svg"

import { FeatureTile } from "./FeatureTile"
import { HeadingOverview } from "./HeadingOverview"
import { ReportsPanel } from "./ReportsPanel"
import { AudioOverview } from "./AudioOverview"
import { AskAnything } from "./AskAnything"

// Keep your existing SummaryPanel EXACTLY as-is.
// We just pass it { summary, isSummarizing, summaryError } from local state.
import SummaryPanel from "@/components/studio/SummaryPanel"

const studioFeatures = [
  { name: "Podcast", icon: <AudioLines />, featureKey: "Audio Overview", bgColor: "bg-[#32343d] hover:bg-[#42444d]" },
  { name: "Ask Anything", icon: <Sparkles />, featureKey: "Ask Anything", bgColor: "bg-[#303632] hover:bg-[#404642]" },
  { name: "Summary", icon: <Brain />, featureKey: "Summary", bgColor: "bg-[#3b3138] hover:bg-[#4b4148]" },
  { name: "Relevant Section", icon: <Highlighter />, featureKey: "Reports", bgColor: "bg-[#3b3b30] hover:bg-[#4b4b40]" },
] as const

export function StudioPanel({
  selectedFile,
  isReportsLoading,
  onReportsLoadingChange,
  onNavigateRequest,
  currentSelection, // ✅ add this
}: {
  selectedFile: FileRecord | null
  isReportsLoading: boolean
  onReportsLoadingChange: (isLoading: boolean) => void
  onNavigateRequest: (target: NavigationTarget) => void
  currentSelection?: string // ✅ optional string
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeFeature, setActiveFeature] = useState<string | null>(null)

  // ----- Summary state & logic (unchanged behavior) -----
  const [summary, setSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [podcastUrl, setPodcastUrl] = useState<string | null>(null);
  const [isPodcastLoading, setIsPodcastLoading] = useState(false);
  React.useEffect(() => {
    if (selectedFile) {
      setActiveFeature(null) // null means HeadingOverview is shown
    }
  }, [selectedFile])

  const handleSummary = async () => {
    if (!selectedFile?.url) {
      setSummaryError("⚠️ No PDF URL available.")
      return
    }

    setIsSummarizing(true)
    setSummary(null)
    setSummaryError(null)

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: selectedFile.url }),
      })
      const plainText = await response.text()
      setSummary(plainText)
    } catch (err: any) {
      setSummaryError("❌ Error generating summary.")
    } finally {
      setIsSummarizing(false)
    }
  }
  // ------------------------------------------------------

  // Reports spinner state (child toggles via callback)
  // const [isReportsLoading, setIsReportsLoading] = useState(false)
  const handleFeatureClick = async (featureKey: string) => {
    setActiveFeature(featureKey);

    if (featureKey === "Summary") {
      handleSummary();
    }

    if (featureKey === "Audio Overview") {
      if (!currentSelection?.trim()) {
        alert("Please select some text to generate the podcast!");
        return;
      }

      setIsPodcastLoading(true);
      setPodcastUrl(null);

      try {
        const res = await fetch("/api/podcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: currentSelection }),
        });

        if (!res.ok) throw new Error("Failed to generate podcast");

        const data = await res.json();
        setPodcastUrl(data.audioUrl);
      } catch (err) {
        console.error(err);
        alert("Failed to generate podcast");
      } finally {
        setIsPodcastLoading(false);
      }
    }
  };
  const renderScrollableContent = () => {
    switch (activeFeature) {
      case "Reports":
        return <ReportsPanel onLoadingChange={onReportsLoadingChange} />
      case "Summary":
        return (
          <div className="flex-1 overflow-y-auto p-4">
            <SummaryPanel
              summary={summary}
              isSummarizing={isSummarizing}
              summaryError={summaryError}
            />
          </div>
        )
      case "Ask Anything":
        return <AskAnything pdfUrl={selectedFile?.url} />
      case "Audio Overview":
        return <AudioOverview
          audioUrl={podcastUrl}
          loading={isPodcastLoading}
        />
      default:
        return <HeadingOverview selectedFile={selectedFile} onNavigateRequest={onNavigateRequest} />
    }
  }


  return (
    <Card
      className={`card-hover-glow flex h-full flex-col transition-all duration-300 rounded-2xl
      ${collapsed ? "w-[56px]" : "w-full sm:w-[300px] md:w-[350px] lg:w-[400px]"}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4">
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
                      className: `h-5 w-5`,
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
                  isLoading={
                    (feature.featureKey === "Summary" && isSummarizing) ||
                    (feature.featureKey === "Reports" && isReportsLoading) ||
                    (feature.featureKey === "Audio Overview" && isPodcastLoading)
                  }
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