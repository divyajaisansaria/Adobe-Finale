// sources-panel.tsx
"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FileText, Trash } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { FileRecord } from "@/lib/idb"
import { runModel1OnUrl } from "@/lib/model1-client"

// Custom SVG Imports
import PdfIcon from "@/assets/icons/pdf-icon.svg"
import AddIcon from "@/assets/icons/add-icon.svg"
import SideNavigationIcon from "@/assets/icons/side-navigation.svg"
import PanelCloseIcon from "@/assets/icons/side-navigation.svg"

export function SourcesPanel({
  sources = [],
  onOpenAdd = () => {},
  onSelectSource = () => {},
  onRemoveSource = () => {},
}: {
  sources?: FileRecord[]
  onOpenAdd?: () => void
  onSelectSource?: (url: string, name: string) => void
  onRemoveSource?: (id: number) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const empty = (sources?.length ?? 0) === 0

  const handleSelect = async (file: FileRecord) => {
    try {
      onSelectSource(file.url, file.name)
      const publicJsonUrl = await runModel1OnUrl(file.url, file.name)
      console.log("Model 1 JSON ready at:", publicJsonUrl)
    } catch (e) {
      console.error("Model 1 processing error:", e)
    }
  }

  const getFileIcon = (fileName: string, size: "small" | "large" = "small") => {
    const className = size === "small" ? "h-4 w-4 flex-shrink-0" : "h-5 w-5"
    if (fileName.toLowerCase().endsWith(".pdf")) {
      return <PdfIcon className={className} />
    }
    return <FileText className={`${className} text-muted-foreground`} />
  }

  return (
   <Card
  className={`card-hover-glow flex h-full min-h-0 flex-col transition-all duration-300 rounded-2xl
    ${collapsed ? "w-[56px] p-2" : "w-full p-4 sm:w-[300px] md:w-[350px] lg:w-[400px]"}`}
    >

      {/* Header */}
      <div
        className={`flex items-center justify-between border-b border-border ${collapsed ? "pb-2" : "pb-4"}`}
      >
        {!collapsed && <div className="Geist Mono text-xl ">Sources</div>}
        <div className="ml-auto">
          {collapsed ? (
            <SideNavigationIcon
              className="h-6 w-6 mt-5 mr-1 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
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
        // COLLAPSED MODE
        <TooltipProvider delayDuration={0}>
          <div className="mt-2 flex min-h-0 flex-1 flex-col">
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={onOpenAdd}
                    aria-label="Add Sources"
                  >
                    <AddIcon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="border-border bg-popover text-popover-foreground">
                  <p>Add Sources</p>
                </TooltipContent>
              </Tooltip>

              <Separator className="my-2 w-8 bg-border" />
            </div>

            <div
              className="relative mt-2 flex-1 overflow-y-auto
                         [-ms-overflow-style:none] [scrollbar-width:none]
                         [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex flex-col items-center gap-2 pb-2">
                {sources.map((file) => (
                  <Tooltip key={file.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleSelect(file)}
                        aria-label={`Open ${file.name}`}
                      >
                        {getFileIcon(file.name, "large")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="border-border bg-popover text-popover-foreground">
                      <p>{file.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>
      ) : (
        // EXPANDED MODE
        <>
          {/* Action Section (NOT scrollable) */}
          <div className="pt-4 pb-4 border-b border-border">
            <Button
              onClick={onOpenAdd}
              className="h-11 w-full justify-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              variant="default"
            >
              <AddIcon className="h-4 w-4" />
              Add Sources
            </Button>
          </div>

          {/* Scrollable Content Area */}
          {empty ? (
            <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted/50">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Your uploaded documents will appear here.
              </p>
            </div>
          ) : (
            <div className="relative -mx-4 mt-4 flex-1 overflow-hidden px-1">
              <ScrollArea className="h-full">
                <ul className="px-3 pb-3">
                  {sources.map((file) => (
                    <li
                      key={file.id}
                      className="group my-1 flex cursor-pointer items-center justify-between rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-accent"
                      onClick={() => handleSelect(file)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {getFileIcon(file.name, "small")}
                        <span className="max-w-[200px] truncate text-sm text-foreground" title={file.name}>
                          {file.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md text-destructive hover:bg-accent hover:text-destructive"
                          aria-label={`Delete ${file.name}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemoveSource?.(file.id)
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </>
      )}
    </Card>
  )
}