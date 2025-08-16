import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Link2, FileText, Sparkles, ShieldCheck, Share } from "lucide-react"

export function FeatureGrid() {
  const items = [
    {
      icon: FileText,
      title: "Multi‑source intake",
      desc: "Upload PDFs, docs, slides, spreadsheets, or add URLs. We keep structure intact.",
      badge: "Docs, PDFs, Links",
    },
    {
      icon: Bot,
      title: "Ask anything",
      desc: "Chat with your sources. Get grounded answers with citations and quotes.",
      badge: "Cited answers",
    },
    {
      icon: Sparkles,
      title: "Auto summaries",
      desc: "Generate summaries, outlines, and study guides—ready to share.",
      badge: "One‑click",
    },
    {
      icon: ShieldCheck,
      title: "Your data stays yours",
      desc: "Content is private by default. Fine-grained control over what you share.",
      badge: "Privacy-first",
    },
    {
      icon: Link2,
      title: "Cross-source reasoning",
      desc: "Synthesize across multiple files and links to uncover insights.",
      badge: "Synthesis",
    },
    {
      icon: Share,
      title: "Export and share",
      desc: "Export notes, citations, and highlights to your favorite tools.",
      badge: "Export",
    },
  ]

  return (
    <section id="features" className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to understand your sources
          </h2>
          <p className="mt-2 text-muted-foreground">
            From ingestion to insights—built for researchers, writers, and teams.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card key={it.title} className="relative">
              <CardHeader className="space-y-2">
                <Badge variant="secondary" className="w-fit">
                  {it.badge}
                </Badge>
                <div className="flex items-center gap-2">
                  <it.icon className="h-5 w-5 text-fuchsia-600" />
                  <CardTitle>{it.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{it.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
