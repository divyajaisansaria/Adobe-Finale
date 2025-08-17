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
  { name: "Audio Overview", icon: <AudioLines />, featureKey: "Audio Overview", bgColor: "bg-[#32343d] hover:bg-[#42444d]" },
  { name: "Ask Anything", icon: <Sparkles />, featureKey: "Ask Anything", bgColor: "bg-[#303632] hover:bg-[#404642]" },
  { name: "Summary", icon: <Brain />, featureKey: "Summary", bgColor: "bg-[#3b3138] hover:bg-[#4b4148]" },
  { name: "Reports", icon: <Highlighter />, featureKey: "Reports", bgColor: "bg-[#3b3b30] hover:bg-[#4b4b40]" },
] as const

export function StudioPanel({
  selectedFile,
  onNavigateRequest,
}: {
  selectedFile: FileRecord | null
  onNavigateRequest: (target: NavigationTarget) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeFeature, setActiveFeature] = useState<string | null>(null)

  // ----- Summary state & logic (unchanged behavior) -----
  const [summary, setSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

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
  const [isReportsLoading, setIsReportsLoading] = useState(false)

  const renderScrollableContent = () => {
    switch (activeFeature) {
      case "Reports":
        return <ReportsPanel onLoadingChange={setIsReportsLoading} />
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
        return <AudioOverview />
      default:
        return <HeadingOverview selectedFile={selectedFile} onNavigateRequest={onNavigateRequest} />
    }
  }

  const handleFeatureClick = (featureKey: string) => {
    setActiveFeature(featureKey)
    // Keep original trigger timing: Summary fetch starts on click
    if (featureKey === "Summary") handleSummary()
    // Reports polling starts when ReportsPanel mounts (equivalent to your previous click->start)
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
                    (feature.featureKey === "Reports" && isReportsLoading)
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
