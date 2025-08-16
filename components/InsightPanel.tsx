"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Lightbulb, Volume2, Sparkles, BookOpen, TrendingUp } from "lucide-react"

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
  confidence: number
}

export function InsightPanel({ isOpen, onClose, currentSection, triggerFetch }: InsightPanelProps) {
  const [activeTab, setActiveTab] = useState("facts")
  const [facts, setFacts] = useState<Fact[]>([])
  const [loading, setLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => setIsMounted(true), [])

  // Debug: watch triggerFetch and currentSection
  useEffect(() => {
    console.log("InsightPanel: triggerFetch changed!", triggerFetch, "currentSection:", currentSection)
    if (currentSection && triggerFetch) {
      fetchFacts(currentSection)
    }
  }, [triggerFetch])

  const fetchFacts = async (text: string) => {
    console.log("Fetching insights for text:", text) // 🔹 debug log
    setLoading(true)
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      console.log("Insight API response:", data) // 🔹 debug log
      setFacts(data.facts || [])
    } catch (err) {
      console.error("Error fetching facts:", err)
    } finally {
      setLoading(false)
    }
  }

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }

  const panelContent = (
    <div
      className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
    >
      <div
        className={`glass-card fixed top-0 h-full w-full max-w-2xl transform transition-transform duration-300 ${
          isOpen ? "translate-x-0 ease-out" : "translate-x-full ease-in"
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
              </TabsList>

              <div className="mt-4 flex-1 overflow-hidden">
                <TabsContent value="facts" className="h-full m-0">
                  <ScrollArea className="h-full pr-3">
                    <div className="space-y-4">
                      {loading
                        ? Array(3)
                            .fill(0)
                            .map((_, idx) => (
                              <Card key={idx} className="glass-tile animate-pulse h-24" />
                            ))
                        : facts.map(fact => (
                            <Card key={fact.id} className="glass-tile glass-hover">
                              <CardHeader className="pb-3 flex justify-between items-start">
                                <div className="flex items-center space-x-2">
                                  <BookOpen className="h-5 w-5 text-blue-500" />
                                  <CardTitle className="text-lg">{fact.title}</CardTitle>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => speakText(fact.content)}>
                                  <Volume2 className="h-4 w-4" />
                                </Button>
                              </CardHeader>
                              <CardContent>
                                <p className="text-muted-foreground mb-3">{fact.content}</p>
                                <div className="flex items-center justify-between">
                                  <Badge variant="secondary" className="capitalize">{fact.category}</Badge>
                                  <div className="flex items-center space-x-1">
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                    <span className="text-xs text-muted-foreground">
                                      {Math.round(fact.confidence * 100)}% confidence
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                    </div>
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
