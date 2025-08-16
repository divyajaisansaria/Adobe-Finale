// components/showcase.tsx
"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { AudioLines } from "lucide-react"

export function Showcase() {
  return (
    <section id="showcase" className="glass-card bg-background py-12 md:py-16">
      <div className=" glass-card container mx-auto grid items-center gap-8 px-4 lg:grid-cols-2 lg:gap-12">
        {/* Left copy */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <AudioLines className="h-4 w-4 text-primary" />
            Audio overviews
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Get <span className="gradient-text-rb">briefed</span> in minutes
          </h2>

          <p className="text-muted-foreground">
            Generate an audio overview to hear key insights on the go. Perfect for reviewing long reports or getting up
            to speed before a meeting.
          </p>

          <div className="flex gap-2">
            {/* Use design tokens (primary) instead of hard-coded colors */}
            <Button className="rounded-full px-5">Generate overview</Button>
            <Button variant="outline" className="rounded-full px-5">
              Learn more
            </Button>
          </div>

          <ul className="grid gap-2 pt-2 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              "Natural voice",
              "Timestamps & links",
              "Download MP3",
              "Share with teammates",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right mock */}
        <div className="relative">
          <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <div className="border-b border-border px-4 py-2 text-sm text-muted-foreground">Audio overview</div>
            <div className="p-4">
              <Image
                src="/audio-waveform-ui.png"
                alt="Audio waveform mock"
                width={600}
                height={160}
                className="h-40 w-full rounded-md border border-border object-cover"
                priority
              />
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="rounded-md border border-border bg-background p-2 text-center">00:00 Intro</div>
                <div className="rounded-md border border-border bg-background p-2 text-center">02:15 Findings</div>
                <div className="rounded-md border border-border bg-background p-2 text-center">05:30 Next steps</div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Mock components. For demo only.</p>
        </div>
      </div>

      <style jsx>{`
        /* Match the site's theme: Light = red→black, Dark = red→near-white */
        .gradient-text-rb {
          --rb1: #ff1f1f;              /* red */
          --rb2: #0f0f0f;              /* near-black for light mode */
          display: inline-block;
          background: linear-gradient(90deg, var(--rb1), var(--rb2));
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }
        :global(html.dark) .gradient-text-rb {
          --rb1: #ff4a4a;              /* softer red for dark */
          --rb2: rgba(255, 255, 255, 0.92);
        }
        @supports not (background-clip: text) {
          .gradient-text-rb { color: var(--rb1); }
        }
      `}</style>
    </section>
  )
}

export default Showcase
