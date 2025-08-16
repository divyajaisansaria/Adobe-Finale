// StudioPanel.tsx
"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, FileAudio2, FileText, BrainCircuit, FileVideo2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { FileRecord } from "@/lib/idb"

// SVG Icon Imports
import SideNavigationIcon from "@/assets/icons/side-navigation.svg"
import PanelCloseIcon from "@/assets/icons/side-navigation.svg"

// Type for the outline items from your JSON
type OutlineItem = {
  level: string
  text: string
  page: number
}

// Type for the navigation command
type NavigationTarget = {
  page: number
  text: string
}

const studioFeatures = [
  { name: "Audio Overview", icon: <FileAudio2 />, featureKey: "Audio Overview" },
  { name: "Video Overview", icon: <FileVideo2 />, featureKey: "Video Overview" },
  { name: "Mind Map", icon: <BrainCircuit />, featureKey: "Mind Map" },
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
            return // Success
          }
          if (res.status !== 404) {
            throw new Error(`Server error: ${res.status}`)
          }
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

  // Handler to queue the navigation command
  const handleGoToPage = (pageNumber: number, text: string) => {
    // Adobe API is 1-based
    const targetPage = pageNumber + 1
    console.log(`Queueing navigation command for page ${targetPage} (Original was ${pageNumber})`)
    onNavigateRequest({ page: targetPage, text })
  }

  const renderStudioContent = () => {
    const filteredOutline = outline.filter((item) => item.text && item.text.trim().length >= 5)

    return (
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* tiles */}
        <div className="grid grid-cols-2 gap-3">
          {studioFeatures.map((feature) => (
            <FeatureTile
              key={feature.name}
              icon={feature.icon}
              label={feature.name}
              onClick={() => setActiveFeature(feature.featureKey)}
            />
          ))}
        </div>

        {/* outline */}
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
          ) : (
            null
          )}
        </div>
      </div>
    )
  }

  return (
   <Card
    className={`glass-card glass-hover  flex h-full flex-col transition-all duration-300 rounded-2xl
    ${collapsed ? "w-[56px]" : "w-full sm:w-[300px] md:w-[350px] lg:w-[400px]"}`}
    >

      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        {!collapsed && <div className="text-sm font-medium text-foreground">Studio</div>}
        <div className="ml-auto">
          {collapsed ? (
            <SideNavigationIcon
              className="h-6 w-6 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setCollapsed(false)}
            />
          ) : (
            <PanelCloseIcon
              className="h-6 w-6 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
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
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <div
      className="cursor-pointer rounded-xl border border-border bg-card/60 p-4 text-foreground transition-colors duration-200 hover:bg-accent/20"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 text-sm">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground ring-1 ring-border/60">
          {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
        </div>
        <span className="truncate">{label}</span>
      </div>
    </div>
  )
}
