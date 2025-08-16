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
  BookOpen,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, useScroll, useTransform } from "framer-motion"
import * as React from "react"

/* ---------------- Types & Data ---------------- */
type Feature = {
  icon: LucideIcon
  title: string
  badge?: string
  desc: string
  color: string // tailwind gradient class end-points e.g. "from-blue-500 to-blue-600"
}

const DEFAULT_FEATURES: Feature[] = [
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
  { icon: BookOpen, title: "100% accurate PDF rendering", badge: "Viewer", desc: "Pixel-perfect in-app PDF rendering, no layout shifts, fonts, or figures lost. Exactly matches the original.", color: "from-violet-500 to-violet-600" },
]

/* ---------------- Utilities ---------------- */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function useColumns() {
  const [cols, setCols] = React.useState(1)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mqLg = window.matchMedia("(min-width: 1024px)")
    const mqSm = window.matchMedia("(min-width: 640px)")
    const compute = () => setCols(mqLg.matches ? 3 : mqSm.matches ? 2 : 1)
    compute()
    const onSm = () => compute()
    const onLg = () => compute()
    mqSm.addEventListener("change", onSm)
    mqLg.addEventListener("change", onLg)
    return () => {
      mqSm.removeEventListener("change", onSm)
      mqLg.removeEventListener("change", onLg)
    }
  }, [])
  return cols
}

/* ---------------- Feature Card ---------------- */
const FeatureCard = React.memo(function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <Card className="glass-card w-full">
      <CardHeader className="space-y-2 pb-2">
        {feature.badge ? (
          <Badge variant="secondary" className="w-fit">
            {feature.badge}
          </Badge>
        ) : null}
        <div className="flex items-center gap-3">
          {/* keep simple; no extra shadows */}
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r ${feature.color} text-white ring-1 ring-border`}>
            <feature.icon className="h-4 w-4" />
          </span>
          <CardTitle className="text-base sm:text-[1.05rem]">{feature.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
      </CardContent>
    </Card>
  )
})

/* ---------------- Sticky Row (row-level animation) ---------------- */
function StickyRow({
  rowFeatures,
  index,
  total,
  topOffset = 88, // stick position
  rowSpacing = 4,  // space between rows (Tailwind units)
}: {
  rowFeatures: Feature[]
  index: number
  total: number
  topOffset?: number
  rowSpacing?: number
}) {
  const spacerRef = React.useRef<HTMLDivElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [spacerH, setSpacerH] = React.useState<number>(480)

  // Measure row height to compute sticky spacer
  React.useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight
      const extra = Math.max(48, Math.min(96, h * 0.3))
      setSpacerH(h + extra)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Scroll progress
  const { scrollYProgress: growProgress } = useScroll({
    target: spacerRef,
    offset: ["start 95%", "start 40%"],
  })
  const { scrollYProgress: recedeProgress } = useScroll({
    target: spacerRef,
    offset: ["start 40%", "end 25%"],
  })

  // Lower row grows into place
  const incomingScale = useTransform(growProgress, [0, 1], [0.92, 1])
  const incomingOpacity = useTransform(growProgress, [0, 1], [0.65, 1])
  const incomingY = useTransform(growProgress, [0, 1], [16, 0])

  // Current sticky row subtly recedes
  const recedeScale = useTransform(recedeProgress, [0, 1], [1, 0.985])
  const recedeOpacityLoss = useTransform(recedeProgress, [0, 1], [0, 0.06])

  // Type-safe combine (prevents TS "unknown" error)
  const scale = useTransform<[number, number], number>(
    [incomingScale, recedeScale],
    ([a, b]) => Math.round(a * b * 10000) / 10000
  )
  const opacity = useTransform<[number, number], number>(
    [incomingOpacity, recedeOpacityLoss],
    ([a, loss]) => Math.max(0, Math.min(1, Math.round((a - loss) * 10000) / 10000))
  )

  return (
    <div
      ref={spacerRef}
      className="relative w-full"
      style={{ height: spacerH, zIndex: total - index, marginTop: index === 0 ? 0 : rowSpacing }}
    >
      <motion.div
        className="sticky will-change-transform"
        style={{ top: topOffset, scale, opacity, y: incomingY, transformOrigin: "top center" }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.28 }}
      >
        <motion.div ref={contentRef} className="rounded-2xl">
          {/* Simple responsive grid: 1 / 2 / 3 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {rowFeatures.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ---------------- Top-Level Component ---------------- */
function FeaturesStackedGrid({
  features = DEFAULT_FEATURES,
  topOffset = 88,
  rowSpacing = 4,
}: {
  features?: Feature[]
  topOffset?: number
  rowSpacing?: number
}) {
  const cols = useColumns()
  const rows = React.useMemo(() => chunk(features, cols), [features, cols])

  return (
    <section id="features" className="py-10 md:py-14">
      <div className="container mx-auto max-w-6xl px-4">
        <header className="mb-8 text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Built for personas <span className="gradient-text-rb">to get jobs done</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
            Upload, understand, jump, and generate—everything in one place, tailored to your user's role.
          </p>
        </header>

        <div className="relative">
          {rows.map((row, i) => (
            <StickyRow
              key={`row-${i}`}
              rowFeatures={row}
              index={i}
              total={rows.length}
              topOffset={topOffset}
              rowSpacing={rowSpacing}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function FeaturesExact(props: React.ComponentProps<typeof FeaturesStackedGrid>) {
  return <FeaturesStackedGrid {...props} />
}

export default FeaturesStackedGrid
