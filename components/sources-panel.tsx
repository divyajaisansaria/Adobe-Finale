// SourcesPanel.tsx

"use client"

import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Plus, FileText, FileIcon, MoreVertical, Trash, Pencil } from "lucide-react"
import { useState } from "react"
import { SourcesToggleButton } from "@/components/ui/SourcesToggleButton"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { FileRecord } from "@/lib/idb" // Import the type for clarity

export function SourcesPanel({
  sources = [],
  onOpenAdd = () => {},
  onSelectSource = () => {},
  onRemoveSource = () => {},
}: {
  sources?: FileRecord[] // Now expects an array of FileRecord
  onOpenAdd?: () => void
  onSelectSource?: (url: string, name: string) => void
  onRemoveSource?: (id: number) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const empty = (sources?.length ?? 0) === 0

  return (
    <Card
      className={`flex h-full flex-col border-white/10 bg-[rgb(27,29,31)] p-4 transition-all duration-300
        ${collapsed ? "w-[50px]" : "w-full sm:w-[300px] md:w-[350px] lg:w-[400px]"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        {!collapsed && <div className="text-xl font-semibold text-white">Sources</div>}
        <div className="ml-auto">
          <SourcesToggleButton collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Add Sources Button */}
          <div className="flex items-center gap-2 my-4">
            <Button onClick={onOpenAdd} className="w-full justify-center gap-2 bg-sky-600 hover:bg-sky-700 transition-colors rounded-lg h-11 text-white" variant="default">
              <Plus className="h-4 w-4" />
              Add Sources
            </Button>
          </div>

          {/* List or Empty State */}
          {empty ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-neutral-700/50">
                <FileText className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-400">Your uploaded documents will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 -mx-4 px-1">
              <ScrollArea className="flex-1">
                <ul className="pb-3 px-3">
                  {/* The map is now a single level, not nested */}
                  {sources.map((file) => (
                    <li
                      key={file.id}
                      className="my-1 group flex items-center justify-between rounded-lg px-2 py-2.5 transition-colors duration-200 cursor-pointer hover:bg-neutral-800"
                      onClick={() => onSelectSource(file.url, file.name)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileIcon className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                        <span className="truncate text-sm text-neutral-300 max-w-[200px]" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <div className="pr-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md">
                              <MoreVertical className="h-4 w-4 text-neutral-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-gray-800 border-gray-700 text-white p-1">
                            <DropdownMenuItem className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-700" onClick={(e) => { e.stopPropagation(); onRemoveSource?.(file.id); }}>
                              <Trash className="h-4 w-4 text-red-500" />
                              <span>Remove</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-700" onClick={(e) => e.stopPropagation()}>
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