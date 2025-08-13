"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, ChevronLeft, FileAudio2, FileText, BrainCircuit, FileVideo2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// --- 1. IMPORT THE NEW SVG ICONS ---
// This method is guaranteed to work and avoids all font issues.
import SideNavigationIcon from '@/assets/icons/side-navigation.svg';
import PanelCloseIcon from '@/assets/icons/side-navigation.svg';

const outputFilePath = "/dummy.json";

// The data array now uses the simple Lucide icons again for the tiles
const studioFeatures = [
    { name: 'Audio Overview', icon: <FileAudio2 />, featureKey: 'Audio Overview' },
    { name: 'Video Overview', icon: <FileVideo2 />, featureKey: 'Video Overview' },
    { name: 'Mind Map', icon: <BrainCircuit />, featureKey: 'Mind Map' },
    { name: 'Reports', icon: <FileText />, featureKey: 'Reports' },
];


export function StudioPanel({ hasSources = false }: { hasSources?: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const [jsonOutput, setJsonOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<any>(null);

  useEffect(() => {
    if (hasSources && activeFeature === 'Reports') {
      setLoading(true);
      setError(null);
      setSelectedSection(null); 
      setJsonOutput(null);
      fetch(outputFilePath)
        .then(response => {
          if (!response.ok) { throw new Error(`Failed to fetch JSON file: ${response.statusText}`); }
          return response.json();
        })
        .then(data => { setJsonOutput(data); setLoading(false); })
        .catch(err => { console.error("Error fetching JSON output:", err); setError("Failed to load studio output."); setLoading(false); });
    } else if (!hasSources) {
      setJsonOutput(null); setError(null); setActiveFeature(null); setSelectedSection(null);
    }
  }, [hasSources, activeFeature]);

  const handleSectionClick = (index: number) => {
    if (jsonOutput && jsonOutput.extracted_sections?.[index] && jsonOutput.subsection_analysis?.[index]) {
      const sectionTitle = jsonOutput.extracted_sections[index]?.section_title;
      const sectionData = { ...jsonOutput.subsection_analysis[index], section_title: sectionTitle };
      setSelectedSection(sectionData);
    } else {
        console.error(`Inconsistent data for index ${index}`);
        setError("An error occurred while trying to display the selected section.");
    }
  };

  const renderStudioContent = () => {
    if (activeFeature === 'Reports') {
      if (loading) return <div className="flex h-full flex-col items-center justify-center p-6 text-center text-neutral-400"><Loader2 className="h-8 w-8 animate-spin text-white" /><p className="mt-4 text-sm">Processing...</p></div>;
      if (error) return <div className="flex h-full flex-col items-center justify-center p-6 text-center text-red-400"><p className="text-sm">{error}</p></div>;
      if (jsonOutput?.extracted_sections) {
        if (selectedSection) {
          return (
            <ScrollArea className="flex-1 p-4">
              <Button variant="ghost" className="mb-2" onClick={() => setSelectedSection(null)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to sections
              </Button>
              <h2 className="text-xl font-semibold">{selectedSection.section_title}</h2>
              <div className="mt-4 rounded-lg bg-gray-800/50 p-4 text-sm text-gray-300">
                <p>{selectedSection.refined_text}</p>
                <span className="mt-2 block text-xs text-gray-500">Page {selectedSection.page_number}</span>
              </div>
            </ScrollArea>
          );
        }
        return (
          <ScrollArea className="flex-1 p-4">
            <h2 className="text-xl font-semibold">Report Sections</h2>
            <div className="mt-4 flex flex-col gap-2">
              {jsonOutput.extracted_sections.map((section: any, index: number) => (
                <Button key={index} onClick={() => handleSectionClick(index)} className="h-auto w-full justify-start rounded-md bg-gray-800/50 p-4 text-left text-white hover:bg-gray-700/50" variant="secondary">
                  <span className="truncate">{section.section_title}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        );
      }
    }
    return (
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {studioFeatures.map((feature) => (
            <FeatureTile key={feature.name} icon={feature.icon} label={feature.name} onClick={() => setActiveFeature(feature.featureKey)} />
          ))}
        </div>
        <div className="mt-8 rounded-lg border border-white/10 bg-black/10 p-6 text-center text-sm text-neutral-400">
          <div className="mb-2"><Sparkles className="mx-auto h-5 w-5 text-violet-400" /></div>
          Studio output will be saved here.
          <div className="mt-1 text-xs text-neutral-500">After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!</div>
          <div className="mt-6 flex justify-center"><Button className="rounded-full bg-white/10 text-neutral-100 hover:bg-white/15" variant="secondary">Add note</Button></div>
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card
      className={`flex h-full flex-col border-white/10 bg-[rgb(27,29,31)] transition-all duration-300
        ${collapsed ? "w-[56px]" : "w-full sm:w-[300px] md:w-[350px] lg:w-[400px]"}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        {!collapsed && <div className="text-sm font-medium text-neutral-200">Studio</div>}
        <div className="ml-auto">
          {/* --- 2. USE THE NEW SVG ICONS FOR THE TOGGLE --- */}
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
            <div className="mt-2 flex flex-col items-center gap-2 p-2">
                {studioFeatures.map((feature) => (
                    <Tooltip key={feature.name}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-neutral-400 hover:bg-neutral-700/50 hover:text-white"
                                onClick={() => { setCollapsed(false); setActiveFeature(feature.featureKey); }}
                            >
                                {React.cloneElement(feature.icon, { className: "h-5 w-5" })}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-black border-neutral-700 text-white">
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
  );
}

function FeatureTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <div className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800/50 p-4 transition-colors duration-200 hover:bg-gray-700" onClick={onClick}>
      <div className="flex items-center gap-3 text-sm text-gray-200">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-700/50 text-gray-300">
            {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
        </div>
        <span>{label}</span>
      </div>
    </div>
  );
}
