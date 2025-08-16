"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

export function Hero(): JSX.Element {
  return (
    <section className="cd-hero relative min-h-screen overflow-hidden isolate">
      {/* Background layers */}
      <div className="cd-hero__grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="cd-hero__stars cd-hero__stars--far pointer-events-none absolute inset-0" aria-hidden />
      <div className="cd-hero__stars cd-hero__stars--near pointer-events-none absolute inset-0" aria-hidden />
      <div className="cd-hero__aurora pointer-events-none absolute inset-0" aria-hidden />

      {/* Top-only vignette */}
      <div className="cd-hero__vignette pointer-events-none absolute inset-0" aria-hidden />

      {/* Bottom fade to page background — increased height */}
      <div
        className="cd-hero__fade pointer-events-none absolute inset-x-0 bottom-0 h-[28vh] sm:h-[32vh] md:h-[36vh]"
        aria-hidden
      />

      {/* Content — increased bottom padding */}
      <div className="relative z-10 mx-auto flex max-w-[1100px] flex-col items-center px-4 pt-44 pb-36 sm:pt-56 sm:pb-44 md:pt-64 md:pb-52">
        {/* local contrast behind text only */}
        <div className="cd-hero__contrast pointer-events-none absolute inset-0 -z-10" aria-hidden />

        <motion.h1
          initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center text-5xl font-semibold leading-[1.2] pb-1 tracking-tight text-foreground sm:text-6xl md:text-7xl"
        >
          Understand <span className="inline-block">Anything</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mx-auto mt-6 max-w-3xl text-center text-base sm:text-lg md:text-xl text-muted-foreground"
        >
          Your thinking partner, grounded in the information you trust.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
          className="mt-8"
        >
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full px-7 font-medium transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <a href="/main">Try Connect Dots</a>
          </Button>
        </motion.div>
      </div>

      {/* SCOPED styles only (unchanged except they already exist in your last version) */}
      <style jsx>{`
        .cd-hero { --cd-page-bg: var(--background); --cd-maroon-1:#7f1022; --cd-maroon-2:#a21b32; --cd-neutral:rgba(255,255,255,.55); }
        :global(html.dark) .cd-hero { --cd-maroon-1:#7f1022; --cd-maroon-2:#a21b32; --cd-neutral:rgba(8,8,10,.65); }

        .cd-hero__grid {
          background-image:
            radial-gradient(circle at 50% 30%, rgba(255,255,255,.10), rgba(255,255,255,.04) 24%, transparent 40%),
            repeating-radial-gradient(circle at 50% 30%, rgba(255,255,255,.05) 0 1px, transparent 1px 100px);
          mix-blend-mode: screen; opacity:.35; animation: cd-grid-rotate 60s linear infinite;
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
                  mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
        }
        @keyframes cd-grid-rotate { 0%{transform:rotate(0) scale(1)}100%{transform:rotate(360deg) scale(1.02)} }

        .cd-hero__stars { background-position:0 0; background-repeat:repeat; background-size:180px 180px;
          -webkit-mask-image: radial-gradient(closest-side, white 70%, transparent 100%);
                  mask-image: radial-gradient(closest-side, white 70%, transparent 100%); }
        .cd-hero__stars--far { opacity:.28;
          background-image:
            radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.9) 50%, transparent 51%),
            radial-gradient(1px 1px at 80% 40%, rgba(255,255,255,.9) 50%, transparent 51%),
            radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,.9) 50%, transparent 51%);
          animation: cd-stars-drift-far 120s linear infinite;
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
                  mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
        }
        .cd-hero__stars--near { opacity:.5; background-size:200px 200px;
          background-image:
            radial-gradient(1.2px 1.2px at 15% 60%, rgba(255,255,255,.9) 50%, transparent 51%),
            radial-gradient(1.2px 1.2px at 55% 20%, rgba(255,255,255,.9) 50%, transparent 51%),
            radial-gradient(1.2px 1.2px at 75% 80%, rgba(255,255,255,.9) 50%, transparent 51%),
            radial-gradient(1.2px 1.2px at 35% 35%, rgba(255,255,255,.9) 50%, transparent 51%);
          animation: cd-stars-drift-near 80s linear infinite;
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
                  mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
        }
        @keyframes cd-stars-drift-far { 0%{transform:translate(0,0)}100%{transform:translate(40px,-80px)} }
        @keyframes cd-stars-drift-near { 0%{transform:translate(0,0)}100%{transform:translate(80px,-140px)} }

        .cd-hero__aurora {
          filter: blur(16px) saturate(115%);
          background:
            radial-gradient(1200px 650px at 15% 10%, var(--cd-maroon-2) 0%, transparent 60%),
            radial-gradient(900px 520px at 80% 15%, var(--cd-neutral) 0%, transparent 60%),
            conic-gradient(from 220deg at 50% 50%,
              transparent 0 10%, rgba(255,255,255,.06) 10% 14%, transparent 14% 30%,
              rgba(255,255,255,.06) 30% 34%, transparent 34% 50%,
              rgba(255,255,255,.06) 50% 54%, transparent 54% 70%,
              rgba(255,255,255,.06) 70% 74%, transparent 74% 100%
            ),
            radial-gradient(1200px 650px at 20% 90%, var(--cd-maroon-1) 0%, transparent 65%),
            radial-gradient(900px 520px at 85% 75%, var(--cd-neutral) 0%, transparent 60%);
          mix-blend-mode: screen; opacity:.9; animation: cd-aurora-sway 22s ease-in-out infinite alternate;
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 88%, transparent 100%);
                  mask-image: linear-gradient(to bottom, black 0%, black 88%, transparent 100%);
        }
        @keyframes cd-aurora-sway { 0%{transform:translateY(0) scale(1)}100%{transform:translateY(-18px) scale(1.02)} }

        .cd-hero__contrast {
          background: radial-gradient(50% 40% at 50% 48%, rgba(0,0,0,0.18), transparent 70%);
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 75%, transparent 100%);
                  mask-image: linear-gradient(to bottom, black 0%, black 75%, transparent 100%);
        }
        :global(html.dark) .cd-hero__contrast {
          background: radial-gradient(50% 40% at 50% 48%, rgba(0,0,0,0.22), transparent 70%);
        }

        .cd-hero__vignette {
          background: radial-gradient(80% 50% at 50% 20%, rgba(0,0,0,0.35) 0%, transparent 70%);
          -webkit-mask-image: linear-gradient(to bottom, black 0%, black 60%, transparent 85%);
                  mask-image: linear-gradient(to bottom, black 0%, black 60%, transparent 85%);
        }

        .cd-hero__fade {
          background: linear-gradient(
            to bottom,
            color-mix(in oklch, var(--cd-page-bg) 0%, transparent) 0%,
            color-mix(in oklch, var(--cd-page-bg) 35%, transparent) 35%,
            color-mix(in oklch, var(--cd-page-bg) 70%, transparent) 65%,
            var(--cd-page-bg) 100%
          );
        }
      `}</style>
    </section>
  )
}

export default Hero
