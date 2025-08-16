"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuroraGradient } from "@/components/aurora-gradient"

export function Hero(): JSX.Element {
  return (
    <section className="glass-card relative overflow-hidden">
      <AuroraGradient className="opacity-70 dark:opacity-60 [mask-image:linear-gradient(to_bottom,black,black,transparent_85%)]" />

      <div className="container relative mx-auto max-w-[1100px] px-4 pt-20 pb-16 sm:pt-24 sm:pb-20 md:pt-28 md:pb-24">
        <h1 className="text-center text-5xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-6xl md:text-7xl">
          {"Understand "}
          <span className="gradient-text-rb">{"Anything"}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-center text-base text-muted-foreground sm:text-lg md:text-xl">
          {"Your thinking partner, grounded in the information you trust."}
        </p>

        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="h-12 rounded-full px-6 font-medium shadow-sm">
            <Link href="/main">Try Connect Dots</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export default Hero