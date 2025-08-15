"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, FileAudio2, FileText, BrainCircuit, FileVideo2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { FileRecord } from "@/lib/idb"

// SVG Icon Imports
import SideNavigationIcon from '@/assets/icons/side-navigation.svg';
import PanelCloseIcon from '@/assets/icons/side-navigation.svg';

// Type for the outline items from your JSON
type OutlineItem = {
  level: string;
  text: string;
  page: number;
};

// Type for the navigation command
type NavigationTarget = {
  page: number;
  text: string;
};

const studioFeatures = [
  { name: 'Audio Overview', icon: <FileAudio2 />, featureKey: 'Audio Overview' },
  { name: 'Video Overview', icon: <FileVideo2 />, featureKey: 'Video Overview' },
  { name: 'Mind Map', icon: <BrainCircuit />, featureKey: 'Mind Map' },
  { name: 'Reports', icon: <FileText />, featureKey: 'Reports' },
];

export function StudioPanel({
  selectedFile,
  onNavigateRequest,
}: {
  selectedFile: FileRecord | null;
  onNavigateRequest: (target: NavigationTarget) => void;
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [isLoadingOutline, setIsLoadingOutline] = useState(false);
  const [outlineError, setOutlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setOutline([]);
      setOutlineError(null);
      return;
    }

    const pollForOutline = async (filename: string, maxRetries: number, delay: number) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const res = await fetch(`/api/outline/${encodeURIComponent(filename)}`);
          if (res.ok) {
            const data = await res.json();
            setOutline(data.outline || []);
            setIsLoadingOutline(false);
            return; // Success
          }
          if (res.status !== 404) {
            throw new Error(`Server error: ${res.status}`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        } catch (err: any) {
          setOutlineError(err.message);
          setIsLoadingOutline(false);
          return;
        }
      }
      setOutlineError("Nothing to be shown here.");
      setIsLoadingOutline(false);
    };

    setIsLoadingOutline(true);
    setOutlineError(null);
    setOutline([]);

    const jsonFilename = selectedFile.name
      .replace(/\.pdf$/i, '.json')
      .replace(/ /g, '_');
    
    pollForOutline(jsonFilename, 20, 500);

  }, [selectedFile]);

  // Handler to queue the navigation command
  const handleGoToPage = (pageNumber: number, text: string) => {
    // --- THIS IS THE FIX for 0-based vs 1-based indexing ---
    // The Adobe API is 1-based, so we add 1 to your model's page number.
    const targetPage = pageNumber + 1;
    console.log(`Queueing navigation command for page ${targetPage} (Original was ${pageNumber})`);
    onNavigateRequest({ page: targetPage, text: text });
  };

  const renderStudioContent = () => {
    const filteredOutline = outline.filter(item => item.text && item.text.trim().length >= 5);

    return (
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {studioFeatures.map((feature) => (
            <FeatureTile
              key={feature.name}
              icon={feature.icon}
              label={feature.name}
              onClick={() => setActiveFeature(feature.featureKey)}
            />
          ))}
        </div>

        <div className="mt-8">
          {isLoadingOutline ? (
            <div className="flex justify-center items-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : outlineError ? (
            <div className="rounded-lg border border-white/10 bg-black/10 p-6 text-center text-sm text-neutral-400">
              <p>{outlineError}</p>
            </div>
          ) : filteredOutline.length > 0 ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-md font-semibold mb-2 px-2 text-neutral-300">Document Outline</h3>
              {filteredOutline.map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="h-auto w-full justify-start text-left text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  style={{ paddingLeft: `${(parseInt(item.level.substring(1))) * 0.75}rem` }}
                  onClick={() => handleGoToPage(item.page, item.text)}
                >
                  <span className="truncate">{item.text}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/10 p-6 text-center text-sm text-neutral-400">
              <div className="mb-2"><Sparkles className="mx-auto h-5 w-5 text-violet-400" /></div>
              Studio output will be saved here.
              <div className="mt-1 text-xs text-neutral-500">
                {selectedFile ? "No significant headings found." : "Select a document to see its outline."}
              </div>
              <div className="mt-6 flex justify-center">
                <Button className="rounded-full bg-white/10 text-neutral-100 hover:bg-white/15" variant="secondary">Add note</Button>
              </div>
            </div>
          )}
        </div>
      </div>
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
      ) : renderStudioContent()}
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
