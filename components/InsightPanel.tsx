'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Lightbulb, AlertTriangle, Link2, Volume2, Sparkles, BookOpen, TrendingUp } from 'lucide-react'

interface InsightPanelProps {
  isOpen: boolean
  onClose: () => void
  currentSection: any
}

export function InsightPanel({ isOpen, onClose, currentSection }: InsightPanelProps) {
  const [activeTab, setActiveTab] = useState('facts')
  // State to ensure the portal is only created on the client-side
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const mockInsights = {
    facts: [
      { id: '1', title: 'Historical Context', content: 'Machine learning algorithms were first conceptualized in the 1950s, but only became practical with modern computing power.', category: 'history', confidence: 0.95 },
      { id: '2', title: 'Performance Milestone', content: 'Deep learning models achieved human-level performance in image recognition tasks around 2015.', category: 'achievement', confidence: 0.92 },
      { id: '3', title: 'Industry Impact', content: 'The global AI market is projected to reach $1.8 trillion by 2030, with machine learning being the largest segment.', category: 'economics', confidence: 0.88 }
    ],
    contradictions: [
      { id: '1', title: 'Complexity vs Interpretability', content: 'While deep learning models achieve high accuracy, they often lack interpretability compared to simpler models.', sources: ['Current document', 'ML_Ethics.pdf'], severity: 'medium' },
      { id: '2', title: 'Data Requirements', content: 'The document suggests small datasets are sufficient, but recent research shows large datasets are crucial for robust performance.', sources: ['Current document', 'BigData_ML.pdf'], severity: 'high' }
    ],
    connections: [
      { id: '1', title: 'Neural Network Architecture', content: 'The CNN architecture mentioned here is also discussed in detail in your Computer Vision document.', linkedDoc: 'Computer_Vision.pdf', relevance: 0.94, pageRef: 'Page 15' },
      { id: '2', title: 'Statistical Foundations', content: 'The mathematical concepts align with the statistical learning theory covered in your Statistics document.', linkedDoc: 'Statistics_ML.pdf', relevance: 0.87, pageRef: 'Chapter 3' }
    ]
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }

  const panelContent = (
    <div
      className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`glass-card fixed top-0 h-full w-full max-w-2xl transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0 ease-out' : 'translate-x-full ease-in'
        }`}
        style={{ right: 0 }}
        onClick={(e) => e.stopPropagation()}
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
                <TabsTrigger value="facts" className="space-x-2"><Sparkles className="h-4 w-4" /><span>Did You Know</span></TabsTrigger>
                <TabsTrigger value="contradictions" className="space-x-2"><AlertTriangle className="h-4 w-4" /><span>Contradictions</span></TabsTrigger>
                <TabsTrigger value="connections" className="space-x-2"><Link2 className="h-4 w-4" /><span>Connections</span></TabsTrigger>
              </TabsList>

              <div className="mt-4 flex-1 overflow-hidden">
                <TabsContent value="facts" className="h-full m-0">
                  <ScrollArea className="h-full pr-3">
                    <div className="space-y-4">
                      {mockInsights.facts.map((fact) => (
                        <Card key={fact.id} className="glass-tile glass-hover">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2"><BookOpen className="h-5 w-5 text-blue-500" /><CardTitle className="text-lg">{fact.title}</CardTitle></div>
                              <Button variant="ghost" size="sm" onClick={() => speakText(fact.content)}><Volume2 className="h-4 w-4" /></Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground mb-3">{fact.content}</p>
                            <div className="flex items-center justify-between"><Badge variant="secondary" className="capitalize">{fact.category}</Badge><div className="flex items-center space-x-1"><TrendingUp className="h-3 w-3 text-green-500" /><span className="text-xs text-muted-foreground">{Math.round(fact.confidence * 100)}% confidence</span></div></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="contradictions" className="h-full m-0">
                  <ScrollArea className="h-full pr-3">
                    <div className="space-y-4">
                      {mockInsights.contradictions.map((contradiction) => (
                        <Card key={contradiction.id} className="glass-tile glass-hover border-orange-500/40 dark:border-orange-600/40">
                           <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2"><AlertTriangle className="h-5 w-5 text-orange-500" /><CardTitle className="text-lg">{contradiction.title}</CardTitle></div>
                              <Button variant="ghost" size="sm" onClick={() => speakText(contradiction.content)}><Volume2 className="h-4 w-4" /></Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground mb-3">{contradiction.content}</p>
                            <div className="flex items-center justify-between"><div className="flex flex-wrap gap-1">{contradiction.sources.map((source, index) => (<Badge key={index} variant="outline" className="text-xs">{source}</Badge>))}</div><Badge variant={contradiction.severity === 'high' ? 'destructive' : 'secondary'} className="capitalize">{contradiction.severity}</Badge></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="connections" className="h-full m-0">
                  <ScrollArea className="h-full pr-3">
                    <div className="space-y-4">
                      {mockInsights.connections.map((connection) => (
                        <Card key={connection.id} className="glass-tile glass-hover border-blue-500/40 dark:border-blue-600/40">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2"><Link2 className="h-5 w-5 text-blue-500" /><CardTitle className="text-lg">{connection.title}</CardTitle></div>
                              <Button variant="ghost" size="sm" onClick={() => speakText(connection.content)}><Volume2 className="h-4 w-4" /></Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground mb-3">{connection.content}</p>
                            <div className="flex items-center justify-between"><div className="flex items-center space-x-2"><Badge variant="outline">{connection.linkedDoc}</Badge><span className="text-xs text-muted-foreground">{connection.pageRef}</span></div><span className="text-xs text-muted-foreground">{Math.round(connection.relevance * 100)}% match</span></div>
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
  );

  // This ensures the portal is only created on the client side, avoiding SSR errors.
  return isMounted ? createPortal(panelContent, document.body) : null;
}