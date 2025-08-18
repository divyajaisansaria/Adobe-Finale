"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AudioLines } from "lucide-react";

export function AudioOverview({ selectedText }: { selectedText?: string }) {
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleGeneratePodcast = async () => {
    if (!selectedText?.trim()) {
      alert("Please select some text to generate the podcast!");
      return;
    }

    setLoading(true);
    setAudioUrl(null);

    try {
      const res = await fetch("/api/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText }),
      });

      if (!res.ok) throw new Error("Failed to generate podcast");

      const data = await res.json();
      setAudioUrl(data.audioUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to generate podcast");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <AudioLines className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Podcast Generator</h2>
      </div>

      <Button onClick={handleGeneratePodcast} disabled={loading}>
        {loading ? "Generating..." : "Generate Podcast"}
      </Button>

      {audioUrl && (
        <audio controls className="mt-4 w-full">
          <source src={audioUrl} type="audio/mpeg" />
        </audio>
      )}
    </Card>
  );
}
