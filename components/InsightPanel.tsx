"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Lightbulb, Volume2, Sparkles, BookOpen } from "lucide-react"

interface InsightPanelProps {
  isOpen: boolean
  onClose: () => void
  currentSection: string
  triggerFetch: boolean
}

interface Fact {
  id: string
  title: string
  content: string
  category: string
}

export function InsightPanel({ isOpen, onClose, currentSection, triggerFetch }: InsightPanelProps) {
  const [activeTab, setActiveTab] = useState("facts")
  const [facts, setFacts] = useState<Fact[]>([])
  const [loading, setLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [speakingText, setSpeakingText] = useState<string | null>(null)

  useEffect(() => setIsMounted(true), [])

  useEffect(() => {
    if (currentSection && triggerFetch) {
      fetchFacts(currentSection)
    }
  }, [triggerFetch])

  const fetchFacts = async (text: string) => {
    console.log("Fetching insights for text:", text);
    setLoading(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      const newFacts: Fact[] = data.facts || [];
      setFacts(newFacts);

      // Auto-switch tab based on first new insight
      if (newFacts.length > 0) {
        const firstCategory = newFacts[0].category.toLowerCase();
        let tabValue = "facts"; // default
        if (firstCategory === "did you know") tabValue = "facts";
        else if (firstCategory === "contradiction") tabValue = "contradictions";
        else if (firstCategory === "takeaway") tabValue = "takeaways";
        setActiveTab(tabValue);
      }

    } catch (err) {
      console.error("Error fetching facts:", err);
    } finally {
      setLoading(false);
    }
  };


  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return

    // Toggle speech on/off
    if (speakingText === text) {
      speechSynthesis.cancel()
      setSpeakingText(null)
      return
    }

    speechSynthesis.cancel() // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.onend = () => setSpeakingText(null)
    speechSynthesis.speak(utterance)
    setSpeakingText(text)
  }

  const renderFacts = (categoryFilter: string | null) => {
    const filtered = categoryFilter
      ? facts.filter(f => f.category.toLowerCase() === categoryFilter.toLowerCase())
      : facts

    return filtered.map(fact => (
      <Card
        key={fact.id}
        className={`glass-tile glass-hover ${speakingText === fact.content ? "ring-2 ring-yellow-400" : ""}`}
      >
        <CardHeader className="pb-3 flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <BookOpen className={`h-5 w-5 ${fact.category.toLowerCase() === "contradiction"
                ? "text-red-500"
                : fact.category.toLowerCase() === "takeaway"
                  ? "text-green-500"
                  : "text-blue-500"
              }`} />
            <CardTitle className="text-lg">{fact.title}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => speakText(fact.content)}>
            <Volume2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{fact.content}</p>
        </CardContent>
      </Card>
    ))
  }

  const panelContent = (
    <div
      className={`bg-app fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      onClick={onClose}
    >
      <div
        className={`app-bg fixed top-0 h-full w-full max-w-2xl transform transition-transform duration-300 ${isOpen ? "translate-x-0 ease-out" : "translate-x-full ease-in"
          }`}
        style={{ right: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-6 glass-divider shrink-0">
            <div className="flex items-center space-x-3">
              <Lightbulb className="h-6 w-6 text-yellow-400" />
              <h2 className="text-2xl font-semibold">Insight Bulb</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </header>

          <main className="flex-1 p-6 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-3 glass-tile p-1 h-auto">
                <TabsTrigger value="facts" className="space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Did You Know</span>
                </TabsTrigger>
                <TabsTrigger value="contradictions" className="space-x-2">
                  <Lightbulb className="h-4 w-4 text-red-400" />
                  <span>Contradictions</span>
                </TabsTrigger>
                <TabsTrigger value="takeaways" className="space-x-2">
                  <Lightbulb className="h-4 w-4 text-green-400" />
                  <span>Key Takeaways</span>
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 flex-1 overflow-hidden">
                <TabsContent value="facts" className="h-full m-0">
                  <ScrollArea className="h-full pr-3">
                    <div className="space-y-4">{loading ? Array(3).fill(0).map((_, idx) => (
                      <Card key={idx} className="glass-tile animate-pulse h-24" />
                    )) : renderFacts(null)}</div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="contradictions" className="h-full m-0">
                  <ScrollArea className="h-full pr-3">
                    <div className="space-y-4">{loading ? Array(3).fill(0).map((_, idx) => (
                      <Card key={idx} className="glass-tile animate-pulse h-24" />
                    )) : renderFacts("Contradiction")}</div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="takeaways" className="h-full m-0">
                  <ScrollArea className="h-full pr-3">
                    <div className="space-y-4">{loading ? Array(3).fill(0).map((_, idx) => (
                      <Card key={idx} className="glass-tile animate-pulse h-24" />
                    )) : renderFacts("Takeaway")}</div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  )

  return isMounted ? createPortal(panelContent, document.body) : null
}
