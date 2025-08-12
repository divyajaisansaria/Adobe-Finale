"use client"

import * as React from "react"
import { AddSourcesModal } from "@/components/add-sources-modal"
import { SourcesPanel} from "@/components/sources-panel"; // Adjust path if needed
import { CenterIntake } from "@/components/center-intake"
import { StudioPanel } from "@/components/studio-panel"
import { getAllFileRecords, deleteFileRecord, type FileRecord } from "@/lib/idb";

export default function MainPage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [sources, setSources] = React.useState<FileRecord[]>([]);
  const [activeTab, setActiveTab] = React.useState("sources");
  const [selectedFile, setSelectedFile] = React.useState<FileRecord | null>(null);

  // Function to fetch all data from DB and update state
  const refreshSources = React.useCallback(async () => {
    const records = await getAllFileRecords();
    setSources(records.reverse()); // Show newest first
  }, []);

  // Load documents from IndexedDB on initial component mount
  React.useEffect(() => {
    refreshSources();
  }, [refreshSources]);

  // Callback for removing a document
  const handleRemoveSource = async (id: number) => {
    try {
      await deleteFileRecord(id);
      if (selectedFile?.id === id) {
        setSelectedFile(null);
      }
      await refreshSources();
    } catch (error) {
      console.error("Failed to remove source:", error);
      alert("Could not remove the document.");
    }
  };

  // Callback to set the active PDF for viewing
  const handleSourceSelect = (url: string, name: string) => {
    const file = sources.find(s => s.url === url);
    if(file) setSelectedFile(file);
  };

  return (
    <div className="min-h-[100dvh] bg-[rgb(20,21,23)] text-white flex flex-col">
      <AddSourcesModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUploadComplete={refreshSources}
      />
      
      {/* Header */}
      <header className="px-6 py-3 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-black rounded-full"></div>
            </div>
            <span className="text-lg font-semibold">Acrobat AI</span>
          </div>
          {/* Mobile Tabs */}
          <div className="md:hidden flex space-x-4">
            <button
              onClick={() => setActiveTab("sources")}
              className={`pb-2 px-1 text-sm font-medium transition-colors duration-200 ${
                activeTab === "sources" ? "border-b-2 border-white text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Sources
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`pb-2 px-1 text-sm font-medium transition-colors duration-200 ${
                activeTab === "chat" ? "border-b-2 border-white text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("studio")}
              className={`pb-2 px-1 text-sm font-medium transition-colors duration-200 ${
                activeTab === "studio" ? "border-b-2 border-white text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Studio
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-gray-400">
          <span className="text-lg">🔒</span>
          <span className="text-lg">⚙️</span>
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">S</div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 overflow-auto p-4">
        <div className="grid h-[calc(100vh-100px)] w-full gap-4 md:grid-cols-3 lg:grid-cols-[350px_1fr_350px]">
          {/* Left Panel */}
          <div className={`h-full md:block ${activeTab === "sources" ? "block" : "hidden"}`}>
            <SourcesPanel
              sources={sources}
              onOpenAdd={() => setIsModalOpen(true)}
              onSelectSource={handleSourceSelect}
              onRemoveSource={handleRemoveSource}
            />
          </div>

          {/* Center Panel */}
          <div className={`h-full col-span-1 md:block ${activeTab === "chat" ? "block" : "hidden"}`}>
            <CenterIntake
              title={selectedFile ? selectedFile.name.replace(/\.[^.]+$/, "") : "Acrobat AI"}
              persona={selectedFile?.persona}
              job={selectedFile?.jobToBeDone}
              pdfUrl={selectedFile?.url}
              onOpenAdd={() => setIsModalOpen(true)}
              hasSources={sources.length > 0}
            />
          </div>
          
          {/* Right Panel */}
          <div className={`h-full md:block ${activeTab === "studio" ? "block" : "hidden"}`}>
            <StudioPanel />
          </div>
        </div>
      </main>
    </div>
  )
}

