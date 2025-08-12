"use client"

import * as React from "react"
import { AddSourcesModal } from "@/components/add-sources-modal"
import { SourcesPanel } from "@/components/sources-panel"
import { CenterIntake } from "@/components/center-intake"
import { StudioPanel } from "@/components/studio-panel"
import { getAllFileRecords, deleteFileRecord, type FileRecord } from "@/lib/idb"
import { Button } from "@/components/ui/button"

export default function MainPage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [sources, setSources] = React.useState<FileRecord[]>([])
  const [activeTab, setActiveTab] = React.useState("sources")
  const [selectedFile, setSelectedFile] = React.useState<FileRecord | null>(null)
  const [persona, setPersona] = React.useState("")
  const [jobToBeDone, setJobToBeDone] = React.useState("")

  const refreshSources = React.useCallback(async () => {
    const records = await getAllFileRecords();
    setSources(records.reverse());
  }, [])

  React.useEffect(() => {
    refreshSources()
  }, [refreshSources])

  const handleRemoveSource = async (id: number) => {
    await deleteFileRecord(id);
    if (selectedFile?.id === id) {
      setSelectedFile(null)
    }
    await refreshSources()
  }
  
  const handleSourceSelect = (url: string, name: string) => {
    const file = sources.find(s => s.url === url && s.name === name)
    if (file) {
      setSelectedFile(file)
      setPersona(file.persona || "")
      setJobToBeDone(file.jobToBeDone || "")

      if (window.innerWidth < 768) {
        setActiveTab('chat');
      }
    }
  }
  
  const hasSources = sources.length > 0

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[rgb(20,21,23)] text-white">
      <AddSourcesModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUploadComplete={refreshSources}
      />
      
      <main className="flex-1 overflow-hidden p-4">
        {/* Desktop Layout (No Changes) */}
        <div className="hidden h-full md:flex md:gap-4">
          <SourcesPanel
            sources={sources}
            onOpenAdd={() => setIsModalOpen(true)}
            onSelectSource={handleSourceSelect}
            onRemoveSource={handleRemoveSource}
          />
          <div className="flex-1 min-w-0 h-full">
            <CenterIntake
              key={selectedFile?.url || 'desktop-no-file'}
              title={selectedFile?.name}
              hasSources={hasSources}
              pdfUrl={selectedFile?.url}
              persona={persona}
              job={jobToBeDone}
              onPersonaChange={setPersona}
              onJobChange={setJobToBeDone}
              onOpenAdd={() => setIsModalOpen(true)}
            />
          </div>
          <StudioPanel hasSources={hasSources} />
        </div>

        {/* --- FINAL, ROBUST MOBILE LAYOUT --- */}
        <div className="flex h-full flex-col gap-4 md:hidden">
          {/* 1. Manual Tab Buttons (No Change) */}
          <div className="grid shrink-0 grid-cols-3 gap-2 rounded-lg bg-neutral-800 p-1">
            <Button
              variant={activeTab === 'sources' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTab('sources')}
              className="h-auto py-1.5 data-[state=active]:bg-neutral-600"
            >
              Sources
            </Button>
            <Button
              variant={activeTab === 'chat' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTab('chat')}
              className="h-auto py-1.5 data-[state=active]:bg-neutral-600"
            >
              Chat
            </Button>
             <Button
              variant={activeTab === 'studio' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTab('studio')}
              className="h-auto py-1.5 data-[state=active]:bg-neutral-600"
            >
              Studio
            </Button>
          </div>

          {/* 2. Content Area with Absolute Positioning */}
          {/* This parent `div` creates the frame for the content. */}
          <div className="flex-1 relative">
            {/* Each panel is now positioned absolutely within the frame, guaranteeing its size. */}
            <div className={`absolute inset-0 ${activeTab === 'sources' ? 'block' : 'hidden'}`}>
              <SourcesPanel
                sources={sources}
                onOpenAdd={() => setIsModalOpen(true)}
                onSelectSource={handleSourceSelect}
                onRemoveSource={handleRemoveSource}
              />
            </div>
            <div className={`absolute inset-0 ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
              <CenterIntake
                key={selectedFile?.url || 'mobile-no-file'}
                title={selectedFile?.name}
                hasSources={hasSources}
                pdfUrl={selectedFile?.url}
                persona={persona}
                job={jobToBeDone}
                onPersonaChange={setPersona}
                onJobChange={setJobToBeDone}
                onOpenAdd={() => setIsModalOpen(true)}
              />
            </div>
            <div className={`absolute inset-0 ${activeTab === 'studio' ? 'block' : 'hidden'}`}>
              <StudioPanel hasSources={hasSources} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}