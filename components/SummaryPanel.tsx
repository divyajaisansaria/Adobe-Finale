"use client";
import React from "react";
import { Loader2 } from "lucide-react";

interface SummaryPanelProps {
  summary: string | null;        // plain text only
  isSummarizing: boolean;
  summaryError: string | null;
}

export default function SummaryPanel({ summary, isSummarizing, summaryError }: SummaryPanelProps) {

  const renderContent = () => {
    if (!summary) return <p>Summary will appear here automatically.</p>;

    // Split by line breaks or double line breaks to preserve paragraphs
    const lines = summary.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

    return lines.map((line, index) => {
      // Detect headings: either --Heading-- OR **Heading**
      let headingText: string | null = null;

      if (line.startsWith("--") && line.endsWith("--")) {
        headingText = line.slice(2, -2);
      } else if (line.startsWith("**") && line.endsWith("**")) {
        headingText = line.slice(2, -2);
      }

      if (headingText) {
        return (
          <h3 key={index} className="font-bold mt-4 mb-1 text-foreground">
            {headingText}
          </h3>
        );
      }

      // Normal paragraph
      return (
        <p key={index} className="text-foreground/90 mt-1 whitespace-pre-wrap">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="mt-4 text-sm p-4 overflow-y-auto max-h-[calc(100%-4rem)]">
      {summaryError && (
        <p className="mt-3 text-sm text-red-500">{summaryError}</p>
      )}

      {isSummarizing ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span>Generating summary, please wait...</span>
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
}
