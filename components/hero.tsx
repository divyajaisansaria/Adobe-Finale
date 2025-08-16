"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"

export function Hero(): JSX.Element {
  // The mouse-tracking logic has been removed as it's not needed for the border-glow effect.

  return (
    <section className="relative flex min-h-screen items-center justify-center p-4">
      
      <div 
        className="card-hover-glow relative w-full max-w-[1100px] rounded-xl border bg-card p-8 text-center shadow-lg md:p-16"
      >
        <h1 className="text-5xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-6xl md:text-7xl">
          {"Understand "}
          {/* MODIFICATION: Added the `font-handwriting` class for the new style */}
          <span className="gradient-text-rb Geist Mono font-handwriting text-6xl sm:text-7xl md:text-8xl">
            {"Anything"}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-base text-muted-foreground sm:text-lg md:text-xl">
          {"Your thinking partner, grounded in the information you trust."}
        </p>

        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="button-hover-scale h-12 rounded-full px-6 font-medium Geist Mono">
            <a href="/main">Try Connect Dots</a>
          </Button>
        </div>
      </div>
    </section>
  )
}

export default Hero
