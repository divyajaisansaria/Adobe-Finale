"use client";

export type StartPodcastParams = {
  text: string;
  hostVoice?: string;   
  guestVoice?: string;  
  title?: string;
  topic?: string;
  maxTurns?: number;    
};

export async function startPodcast(params: StartPodcastParams) {
  const res = await fetch("/api/podcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    const detail = data?.detail || data?.error || "Podcast generation failed";
    throw new Error(detail);
  }

  return data.audioUrl as string;
}

export async function listPodcasts() {
  const res = await fetch("/api/podcast?list=1", { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as {
    items: Array<{ file: string; url: string; size: number | null; createdAt: string | null }>;
  };
}
