"use client"

import * as React from "react"
import { AddSourcesModal } from "@/components/add-sources-modal"
import { SourcesPanel } from "@/components/sources-panel"
import { CenterIntake } from "@/components/center-intake"
import { StudioPanel } from "@/components/studio-panel"
import { getAllFileRecords, deleteFileRecord, type FileRecord } from "@/lib/idb"
import { Button } from "@/components/ui/button"

// Added imports for the Insight Panel
import { InsightPanel } from '@/components/InsightPanel'
import { Lightbulb } from 'lucide-react'

// Type for the navigation command object
type NavigationTarget = {
  page: number
  text: string
}

export default function MainPage() {
  // Existing state
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [sources, setSources] = React.useState<FileRecord[]>([])
  const [activeTab, setActiveTab] = React.useState<"sources" | "chat" | "studio">("sources")
  const [selectedFile, setSelectedFile] = React.useState<FileRecord | null>(null)
  const [navigationQueue, setNavigationQueue] = React.useState<NavigationTarget | null>(null)
  const [isViewerReady, setIsViewerReady] = React.useState(false)

  // Added state for the Insight Panel
  const [isInsightPanelOpen, setIsInsightPanelOpen] = React.useState(false)

  // Existing functions
  const refreshSources = React.useCallback(async () => {
    const records = await getAllFileRecords()
    setSources(records.reverse())
  }, [])

  React.useEffect(() => {
    refreshSources()
  }, [refreshSources])

  const handleRemoveSource = async (id: number) => {
    await deleteFileRecord(id)
    if (selectedFile?.id === id) {
      setSelectedFile(null)
    }
    await refreshSources()
  }

  const handleSourceSelect = (url: string, name: string) => {
    const file = sources.find(s => s.url === url && s.name === name)
    if (file) {
      setSelectedFile(file)
      setNavigationQueue(null)
      setIsViewerReady(false)
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setActiveTab("chat")
      }
    }
  }

  const hasSources = sources.length > 0

  return (
    <div className="app-bg flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <AddSourcesModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUploadComplete={refreshSources}
      />

      <main className="flex-1 overflow-hidden p-4">
        {/* --- Desktop Layout --- */}
        <div className="hidden h-full md:flex md:gap-4">
          <SourcesPanel
            sources={sources}
            onOpenAdd={() => setIsModalOpen(true)}
            onSelectSource={handleSourceSelect}
            onRemoveSource={handleRemoveSource}
          />

          <div className="min-w-0 h-full flex-1">
            <CenterIntake
              key={selectedFile?.url || "desktop-no-file"}
              title={selectedFile?.name}
              hasSources={hasSources}
              pdfUrl={selectedFile?.url}
              onOpenAdd={() => setIsModalOpen(true)}
              navigationTarget={isViewerReady ? navigationQueue : null}
              onViewerReady={setIsViewerReady}
            />
          </div>

          <StudioPanel
            selectedFile={selectedFile}
            onNavigateRequest={setNavigationQueue}
          />
        </div>

        {/* --- Mobile Layout --- */}
        <div className="flex h-full flex-col gap-4 md:hidden">
          <div className="grid shrink-0 grid-cols-3 gap-2 rounded-lg border bg-secondary p-1 text-secondary-foreground">
            <Button
              variant={activeTab === "sources" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("sources")}
              className="h-auto py-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              data-state={activeTab === "sources" ? "active" : "inactive"}
            >
              Sources
            </Button>
            <Button
              variant={activeTab === "chat" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("chat")}
              className="h-auto py-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              data-state={activeTab === "chat" ? "active" : "inactive"}
            >
              Chat
            </Button>
            <Button
              variant={activeTab === "studio" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("studio")}
              className="h-auto py-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              data-state={activeTab === "studio" ? "active" : "inactive"}
            >
              Studio
            </Button>
          </div>

          <div className="relative flex-1">
            <div className={`absolute inset-0 ${activeTab === "sources" ? "block" : "hidden"}`}>
              <SourcesPanel
                sources={sources}
                onOpenAdd={() => setIsModalOpen(true)}
                onSelectSource={handleSourceSelect}
                onRemoveSource={handleRemoveSource}
              />
            </div>

            <div className={`absolute inset-0 ${activeTab === "chat" ? "block" : "hidden"}`}>
              <CenterIntake
                key={selectedFile?.url || "mobile-no-file"}
                title={selectedFile?.name}
                hasSources={hasSources}
                pdfUrl={selectedFile?.url}
                onOpenAdd={() => setIsModalOpen(true)}
                navigationTarget={isViewerReady ? navigationQueue : null}
                onViewerReady={setIsViewerReady}
              />
            </div>

            <div className={`absolute inset-0 ${activeTab === "studio" ? "block" : "hidden"}`}>
              <StudioPanel
                selectedFile={selectedFile}
                onNavigateRequest={setNavigationQueue}
              />
            </div>
          </div>
        </div>
      </main>

      {/* --- ADDITIONS FOR INSIGHT PANEL --- */}

      {/* Floating Insight Button */}
      <Button
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg glass-hover"
        onClick={() => setIsInsightPanelOpen(true)}
        size="icon"
        aria-label="Open insights"
      >
        <Lightbulb className="h-6 w-6" />
      </Button>

      {/* Render the Insight Panel */}
      <InsightPanel
        isOpen={isInsightPanelOpen}
        onClose={() => setIsInsightPanelOpen(false)}
        currentSection={null}
      />
    </div>
  )
}