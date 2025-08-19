"use client"

import * as React from "react"
import { AddSourcesModal } from "@/components/add-sources-modal"
import { SourcesPanel } from "@/components/sources-panel"
import { CenterIntake } from "@/components/center-intake"
import { StudioPanel } from "@/components/studio/StudioPanel"
import { getAllFileRecords, deleteFileRecord, type FileRecord } from "@/lib/idb"
import { Button } from "@/components/ui/button"
import { InsightPanel } from "@/components/InsightPanel"
import { Lightbulb } from "lucide-react"

type NavigationTarget = { page: number; text: string }

const bulbGlowAnimation = `
  @keyframes bulb-glow {
    0%, 100% {
      box-shadow: 0 0 15px rgba(251, 191, 36, 0.5), 0 0 5px rgba(209, 160, 37, 0.7);
    }
    50% {
      box-shadow: 0 0 30px rgba(189, 151, 55, 0.8), 0 0 10px rgba(196, 156, 55, 1);
    }
  }
`;
const bulbColorAnimation = `
  @keyframes color-pulse {
    0%, 100% {
      background-color: #e5e5e5; /* neutral-200 */
      color: #000;
    }
    50% {
      background-color: #c6ab55ff; /* yellow-300 */
      color: #000;
    }
  }
`;

export default function MainPage() {
  const [adobeClientId, setAdobeClientId] = React.useState<string>("")

  const [isModalOpen, setIsModalOpen] = React.useState(true)
  const [sources, setSources] = React.useState<FileRecord[]>([])
  const [activeTab, setActiveTab] = React.useState<"sources" | "chat" | "studio">("sources")
  const [selectedFile, setSelectedFile] = React.useState<FileRecord | null>(null)
  const [navigationQueue, setNavigationQueue] = React.useState<NavigationTarget | null>(null)
  const [isViewerReady, setIsViewerReady] = React.useState(false)
  const [currentSelection, setCurrentSelection] = React.useState<string>("")
  const [isReportsLoading, setIsReportsLoading] = React.useState(false)
  const [isInsightPanelOpen, setIsInsightPanelOpen] = React.useState(false)
  const [triggerFetch, setTriggerFetch] = React.useState(false)
  const [isInsightBulbGlowing, setIsInsightBulbGlowing] = React.useState(false)

  // Fetch Adobe key from server route in the same segment
  React.useEffect(() => {
    let alive = true
    fetch("/main/env")
      .then(r => r.json())
      .then(d => { if (alive) setAdobeClientId(d?.adobeClientId || "") })
      .catch(() => { if (alive) setAdobeClientId("") })
    return () => { alive = false }
  }, [])

  const refreshSources = React.useCallback(async () => {
    const records = await getAllFileRecords()
    setSources(records.reverse())
  }, [])

  React.useEffect(() => {
    refreshSources()
  }, [refreshSources])

  React.useEffect(() => {
    if (currentSelection.trim()) {
      setIsReportsLoading(true)
      setIsInsightBulbGlowing(true)
    }
  }, [currentSelection])

  const handleRemoveSource = async (id: number) => {
    await deleteFileRecord(id)
    if (selectedFile?.id === id) setSelectedFile(null)
    await refreshSources()
  }

  const handleSourceSelect = (url: string, name: string) => {
    const file = sources.find(s => s.url === url && s.name === name)
    if (file) {
      setSelectedFile(file)
      setNavigationQueue(null)
      setIsViewerReady(false)
      if (typeof window !== "undefined" && window.innerWidth < 768) setActiveTab("chat")
    }
  }

  const hasSources = sources.length > 0

  return (
    <div className="app-bg flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <style>{bulbGlowAnimation + bulbColorAnimation}</style>
      <AddSourcesModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUploadComplete={refreshSources}
      />

      <main className="flex-1 overflow-hidden p-4">
        {/* Desktop layout */}
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
              onSelectionChange={setCurrentSelection}
              adobeClientId={adobeClientId}  // ← pass runtime key
            />
          </div>

          <StudioPanel
            selectedFile={selectedFile}
            currentSelection={currentSelection}
            onNavigateRequest={setNavigationQueue}
            isReportsLoading={isReportsLoading}
            onReportsLoadingChange={setIsReportsLoading}
          />
        </div>

        {/* Mobile layout */}
        <div className="flex h-full flex-col gap-4 md:hidden">
          <div className="grid shrink-0 grid-cols-3 gap-2 rounded-lg border bg-secondary p-1 text-secondary-foreground">
            <Button
              variant={activeTab === "sources" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("sources")}
              className="h-auto py-1.5"
            >
              Sources
            </Button>
            <Button
              variant={activeTab === "chat" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("chat")}
              className="h-auto py-1.5"
            >
              Chat
            </Button>
            <Button
              variant={activeTab === "studio" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("studio")}
              className="h-auto py-1.5"
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
                onSelectionChange={setCurrentSelection}
                adobeClientId={adobeClientId}  // ← pass runtime key
              />
            </div>

            <div className={`absolute inset-0 ${activeTab === "studio" ? "block" : "hidden"}`}>
              <StudioPanel
                selectedFile={selectedFile}
                currentSelection={currentSelection}
                onNavigateRequest={setNavigationQueue}
                isReportsLoading={isReportsLoading}
                onReportsLoadingChange={setIsReportsLoading}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Floating Insight Button */}
      <div className="fixed bottom-6 right-6 z-40 h-14 w-14">
        {isInsightBulbGlowing && (
          <div className="absolute inset-0 rounded-full animate-[bulb-glow_2s_ease-in-out_infinite]" />
        )}

        <Button
          className={`relative h-full w-full rounded-full shadow-lg ${
            isInsightBulbGlowing
              ? "animate-[color-pulse_2s_ease-in-out_infinite]"
              : "bg-neutral-200 text-black hover:bg-neutral-300"
          }`}
          onClick={() => {
            if (!currentSelection.trim()) {
              alert("Please select text to generate insights!")
              return
            }
            setIsInsightPanelOpen(true)
            setTriggerFetch(prev => !prev)
            setIsInsightBulbGlowing(false)
          }}
          size="icon"
          aria-label="Open insights"
        >
          <Lightbulb className="h-6 w-6" />
        </Button>
      </div>

      <InsightPanel
        isOpen={isInsightPanelOpen}
        onClose={() => setIsInsightPanelOpen(false)}
        currentSection={currentSelection}
        triggerFetch={triggerFetch}
      />
    </div>
  )
}
