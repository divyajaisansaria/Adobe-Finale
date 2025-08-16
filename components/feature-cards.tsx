"use client"

import {
  Upload,
  Brain,
  Heading1,
  Search,
  Highlighter,
  Quote,
  ArrowRightLeft,
  Bot,
  Sparkles,
  GitCompare,
  AudioLines,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, useScroll, useTransform } from "framer-motion"
import * as React from "react"

/* ---------------- Enhanced data with colors ---------------- */
type Feature = {
  icon: LucideIcon
  title: string
  badge?: string
  desc: string
  color: string
}

const FEATURES: Feature[] = [
  { icon: Upload, title: "Upload multiple documents", badge: "PDF", desc: "Drag & drop or select multiple files at once. Prefer Adobe PDF Embed API for crisp in-app rendering.", color: "from-blue-500 to-blue-600" },
  { icon: Brain, title: "Extract concepts & insights", badge: "Extraction", desc: "Parse chapters to surface key concepts, mechanisms, definitions, and relationships across sources.", color: "from-purple-500 to-purple-600" },
  { icon: Heading1, title: "Identify section headings", badge: "1A logic", desc: "Automatically detect section and subsection headings across PDFs and documents.", color: "from-green-500 to-green-600" },
  { icon: Search, title: "Find relevant sections", badge: "1B logic", desc: "Score and rank passages relevant to the persona and job, per document and across the whole set.", color: "from-orange-500 to-orange-600" },
  { icon: Highlighter, title: "Highlight inside the PDF", badge: "Inline", desc: "Visual highlights mapped to concepts so users can see where the evidence comes from.", color: "from-yellow-500 to-yellow-600" },
  { icon: Quote, title: "Concept snippets", badge: "Citations", desc: "Show short, cited snippets for each concept with links back to the exact location in the PDF.", color: "from-pink-500 to-pink-600" },
  { icon: ArrowRightLeft, title: "Jump across sections", badge: "Cross-nav", desc: "Move between all relevant sections with a single click to compare context quickly.", color: "from-indigo-500 to-indigo-600" },
  { icon: Bot, title: "Key insights", badge: "LLM", desc: "Generate concise, persona-aware insights grounded in the uploaded sources.", color: "from-red-500 to-red-600" },
  { icon: Sparkles, title: '"Did you know?" facts', badge: "LLM", desc: "Surface interesting facts and edge cases to deepen understanding or spark curiosity.", color: "from-teal-500 to-teal-600" },
  { icon: GitCompare, title: "Contradictions & connections", badge: "LLM", desc: "Reveal counterpoints, contradictions, and cross-document connections with citations.", color: "from-cyan-500 to-cyan-600" },
  { icon: AudioLines, title: "2–5 minute podcast", badge: "Audio overview", desc: "Auto-generate a short podcast for the current and related sections using extracted insights.", color: "from-emerald-500 to-emerald-600" },
]

/* ---------------- Component (one card per row, sticky/stacking) ---------------- */
export function FeaturesExact() {
  return (
    <section id="features" className="py-12 md:py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <header className="mb-10 text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Built for personas{" "}
            <span className="gradient-text-rb">to get jobs done</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
            Upload, understand, jump, and generate—everything in one place, tailored to your user's role.
          </p>
        </header>

        {/* The stack container */}
        <div className="relative">
          {FEATURES.map((f, i) => (
            <Row key={f.title} index={i} total={FEATURES.length}>
              <StickyFeatureCard index={i} total={FEATURES.length} feature={f} />
            </Row>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Pieces ---------------- */

/** Row provides scroll space; each row is the height that the sticky card will occupy while it "sticks". */
function Row({
  children,
  index,
  total,
}: {
  children: React.ReactNode
  index: number
  total: number
}) {
  // taller rows on larger screens for a nice stack feel
  const baseH = "h-[220px] sm:h-[240px] md:h-[260px]"
  return (
    <div
      className={`relative ${baseH} mb-6 sm:mb-8`}
      style={{ zIndex: total - index }}
    >
      {children}
    </div>
  )
}

/** The actual sticky/animated card */
function StickyFeatureCard({
  feature,
  index,
  total,
}: {
  feature: Feature
  index: number
  total: number
}) {
  const ref = React.useRef<HTMLDivElement | null>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 90%", "end 60%"],
  })

  const y = useTransform(scrollYProgress, [0, 1], [16, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.98, 1])
  const opacity = useTransform(scrollYProgress, [0, 1], [0.6, 1])

  return (
    <motion.div
      ref={ref}
      className="sticky top-24"
      style={{ zIndex: total - index, y, scale, opacity }}
      transition={{ type: "spring", stiffness: 220, damping: 30, mass: 0.6 }}
    >
      {/* MODIFICATION: Replaced the default card styling with your `glass-card` class */}
      <Card className="glass-card">
        <CardHeader className="space-y-2 pb-2">
          {feature.badge ? (
            <Badge variant="secondary" className="w-fit">
              {feature.badge}
            </Badge>
          ) : null}

          <div className="flex items-center gap-3">
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r ${feature.color} text-white ring-1 ring-border shadow-lg`}>
              <feature.icon className="h-4 w-4" />
            </span>
            <CardTitle className="text-base sm:text-[1.05rem]">{feature.title}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="pb-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default FeaturesExact