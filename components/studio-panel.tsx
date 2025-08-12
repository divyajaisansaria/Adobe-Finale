"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  FileAudio2,
  FileText,
  FileVideo2,
  BrainCircuit,
  Sparkles,
  MoreVertical,
  Loader2,
  ChevronLeft
} from "lucide-react"
import { StudioToggleButton } from "@/components/ui/StudioToggleButton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

const outputFilePath = "/dummy.json";

export function StudioPanel({ hasSources = false }: { hasSources?: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const [jsonOutput, setJsonOutput] = useState<any>(null); // Consider defining a specific type/interface for this
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);

  useEffect(() => {
    // Only fetch data when the 'Reports' feature is specifically activated
    if (hasSources && activeFeature === 'Reports') {
      setLoading(true);
      setError(null); // Clear previous errors on new fetch
      fetch(outputFilePath)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch JSON file: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          setJsonOutput(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching JSON output:", err);
          setError("Failed to load studio output. Please check the 'dummy.json' file in the 'public' folder.");
          setLoading(false);
        });
    } else if (!hasSources) {
      // Reset all state if sources are removed
      setJsonOutput(null);
      setError(null);
      setActiveFeature(null);
      setSelectedSection(null);
    }
  }, [hasSources, activeFeature]);

  // Safer handler that checks for data consistency
  const handleSectionClick = (index: number) => {
    if (jsonOutput && jsonOutput.extracted_sections?.[index] && jsonOutput.subsection_analysis?.[index]) {
      const sectionTitle = jsonOutput.extracted_sections[index]?.section_title;
      const sectionData = {
        ...jsonOutput.subsection_analysis[index],
        section_title: sectionTitle
      };
      setSelectedSection(sectionData);
    } else {
        console.error(`Inconsistent data for index ${index}`);
        setError("An error occurred while trying to display the selected section.");
    }
  };

  const renderStudioContent = () => {
    if (activeFeature === 'Reports') {
      if (loading) {
        return (
          <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-400 h-full">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="mt-4 text-sm">Processing PDF...</p>
          </div>
        );
      }
      
      if (error) {
        return (
          <div className="flex flex-col items-center justify-center p-6 text-center text-red-400 h-full">
            <p className="text-sm">{error}</p>
          </div>
        );
      }

      if (jsonOutput && jsonOutput.extracted_sections) {
        if (!selectedSection) {
          return (
            <ScrollArea className="flex-1 p-4">
              <h2 className="text-xl font-semibold">Report Sections</h2>
              <div className="flex flex-col gap-2 mt-4">
                {jsonOutput.extracted_sections.map((section: any, index: number) => (
                  <Button
                    key={index}
                    onClick={() => handleSectionClick(index)}
                    className="w-full flex justify-start text-left p-4 h-auto rounded-md bg-gray-800/50 text-white hover:bg-gray-700/50"
                    variant="secondary"
                  >
                    <span className="truncate">{section.section_title}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          );
        } else {
          return (
            <ScrollArea className="flex-1 p-4">
              <h2 className="text-xl font-semibold">{selectedSection.section_title}</h2>
              <div className="rounded-lg bg-gray-800/50 p-4 text-sm text-gray-300 mt-4">
                <p>{selectedSection.refined_text}</p>
                <span className="text-xs text-gray-500 mt-2 block">Page {selectedSection.page_number}</span>
              </div>
            </ScrollArea>
          );
        }
      }
    }

    // Default view with feature tiles
    return (
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <FeatureTile icon={<FileAudio2 className="h-5 w-5 text-gray-300" />} label="Audio Overview" onClick={() => setActiveFeature('Audio Overview')} />
          <FeatureTile icon={<FileVideo2 className="h-5 w-5 text-gray-300" />} label="Video Overview" onClick={() => setActiveFeature('Video Overview')} />
          <FeatureTile icon={<BrainCircuit className="h-5 w-5 text-gray-300" />} label="Mind Map" onClick={() => setActiveFeature('Mind Map')} />
          <FeatureTile icon={<FileText className="h-5 w-5 text-gray-300" />} label="Reports" onClick={() => setActiveFeature('Reports')} />
        </div>
        <div className="mt-8 rounded-lg border border-white/10 bg-black/10 p-6 text-center text-sm text-neutral-400">
          <div className="mb-2">
            <Sparkles className="mx-auto h-5 w-5 text-violet-400" />
          </div>
          Studio output will be saved here.
          <div className="mt-1 text-xs text-neutral-500">
            After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
          </div>
          <div className="mt-6 flex justify-center">
            <Button className="rounded-full bg-white/10 text-neutral-100 hover:bg-white/15" variant="secondary">
              Add note
            </Button>
          </div>
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card
      className={`flex h-full flex-col border-white/10 bg-[rgb(27,29,31)] transition-all duration-300
        ${collapsed ? "w-[50px] overflow-hidden" : "sm:w-[300px] md:w-[350px] lg:w-[400px]"}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        {/* Only show the back button when a specific section is selected */}
        {activeFeature === 'Reports' && selectedSection ? (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:bg-neutral-700/50" onClick={() => setSelectedSection(null)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : (
          <div className="text-sm font-medium text-neutral-200">Studio</div>
        )}
        <div className="ml-auto">
          <StudioToggleButton
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
          />
        </div>
      </div>
      {!collapsed && renderStudioContent()}
    </Card>
  )
}

function FeatureTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 transition-colors duration-200 hover:bg-gray-700 cursor-pointer" onClick={onClick}>
      <div className="flex items-center gap-3 text-sm text-gray-200">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-700/50 text-gray-300">{icon}</div>
        <span>{label}</span>
      </div>
    </div>
  )
}