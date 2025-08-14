//sources-panel.tsx
"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FileText, MoreVertical, Trash, Pencil } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { FileRecord } from "@/lib/idb"
import { runModel1OnUrl } from "@/lib/model1-client" // ⬅️ 1. ADDED: Import the model function

// Custom SVG Imports
import PdfIcon from '@/assets/icons/pdf-icon.svg';
import AddIcon from '@/assets/icons/add-icon.svg';
import SideNavigationIcon from '@/assets/icons/side-navigation.svg';
import PanelCloseIcon from '@/assets/icons/side-navigation.svg';

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

  // ⬅️ 2. ADDED: The handler function that calls the model
  const handleSelect = async (file: FileRecord) => {
    try {
      // First, select the source to show it in the UI
      onSelectSource(file.url, file.name)

      // Then, trigger the background model processing
      const publicJsonUrl = await runModel1OnUrl(file.url, file.name)
      console.log("Model 1 JSON ready at:", publicJsonUrl)
    } catch (e) {
      console.error("Model 1 processing error:", e)
    }
  }

  const getFileIcon = (fileName: string, size: 'small' | 'large' = 'small') => {
    const className = size === 'small' ? "h-4 w-4 flex-shrink-0" : "h-5 w-5";

    if (fileName.toLowerCase().endsWith('.pdf')) {
      return <PdfIcon className={className} />;
    }
    return <FileText className={`${className} text-neutral-400`} />;
  };

  return (
    <Card
      className={`flex h-full flex-col border-white/10 bg-[rgb(27,29,31)] transition-all duration-300
        ${collapsed ? "w-[56px] p-2" : "w-full p-4 sm:w-[300px] md:w-[350px] lg:w-[400px]"}`}
    >
      <div className={`flex items-center justify-between border-b border-white/10 ${collapsed ? 'pb-2' : 'pb-4'}`}>
        {!collapsed && <div className="text-xl font-semibold text-white">Sources</div>}
        <div className="ml-auto">
          {collapsed ? (
            <SideNavigationIcon
              className="h-6 w-6 cursor-pointer text-neutral-400 transition-colors hover:text-white"
              onClick={() => setCollapsed(false)}
            />
          ) : (
            <PanelCloseIcon
              className="h-6 w-6 cursor-pointer text-neutral-400 transition-colors hover:text-white"
              onClick={() => setCollapsed(true)}
            />
          )}
        </div>
      </div>

      {collapsed ? (
        <TooltipProvider delayDuration={0}>
            <div className="mt-4 flex flex-col items-center gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-400 hover:bg-sky-700/50 hover:text-white" onClick={onOpenAdd}>
                            <AddIcon className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-black border-neutral-700 text-white">
                        <p>Add Sources</p>
                    </TooltipContent>
                </Tooltip>

                <Separator className="my-1 bg-neutral-700" />

                <ScrollArea className="h-full w-full">
                    <div className="flex flex-col items-center gap-2">
                        {sources.map((file) => (
                            <Tooltip key={file.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-neutral-400 hover:bg-neutral-700/50"
                                        onClick={() => handleSelect(file)} // ⬅️ 3. UPDATED: Call handleSelect here
                                    >
                                        {getFileIcon(file.name, 'large')}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-black border-neutral-700 text-white">
                                    <p>{file.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </TooltipProvider>
      ) : (
        <>
          <div className="my-4 flex items-center gap-2">
            <Button onClick={onOpenAdd} className="h-11 w-full justify-center gap-2 rounded-lg bg-sky-600 text-white transition-colors hover:bg-sky-700" variant="default">
              <AddIcon className="h-4 w-4" />
              Add Sources
            </Button>
          </div>

          {empty ? (
            <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-neutral-700/50">
                <FileText className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-400">Your uploaded documents will appear here.</p>
            </div>
          ) : (
            <div className="-mx-4 flex flex-1 flex-col px-1">
              <ScrollArea className="flex-1">
                <ul className="px-3 pb-3">
                  {sources.map((file) => (
                    <li
                      key={file.id}
                      className="group my-1 flex cursor-pointer items-center justify-between rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-neutral-800"
                      onClick={() => handleSelect(file)} // ⬅️ 3. UPDATED: Call handleSelect here too
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {getFileIcon(file.name, 'small')}
                        <span className="max-w-[200px] truncate text-sm text-neutral-300" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md">
                              <MoreVertical className="h-4 w-4 text-neutral-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="border-gray-700 bg-gray-800 p-1 text-white">
                            <DropdownMenuItem className="flex cursor-pointer items-center gap-2 p-2 hover:bg-gray-700" onClick={(e) => { e.stopPropagation(); onRemoveSource?.(file.id); }}>
                              <Trash className="h-4 w-4 text-red-500" />
                              <span>Remove</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex cursor-pointer items-center gap-2 p-2 hover:bg-gray-700" onClick={(e) => e.stopPropagation()}>
                              <Pencil className="h-4 w-4 text-neutral-400" />
                              <span>Rename</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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