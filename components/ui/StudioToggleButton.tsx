"use client"

import * as React from "react"
import { ChevronLeft, LayoutPanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button" // Assuming you have a button component

export const StudioToggleButton = ({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="h-7 w-7 text-neutral-400 hover:bg-neutral-700/50 transition-colors"
      aria-label="Toggle sources panel"
    >
      {/* The LayoutPanelLeft icon will now be displayed all the time */}
      <LayoutPanelLeft className="h-4 w-4" />
    </Button>
  )
}
