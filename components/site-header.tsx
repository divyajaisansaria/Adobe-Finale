// components/site-header.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import MainIcon from "@/assets/icons/Icon.svg"

function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground/70"
        aria-label="Toggle theme"
        disabled
      >
        <span className="material-symbols-outlined text-[20px]">dark_mode</span>
      </button>
    )
  }

  const isDark = (resolvedTheme ?? theme) === "dark"

  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-muted/60"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="material-symbols-outlined text-[20px] leading-none">
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Home">
          <span className="inline-flex h-8 w-8 items-center justify-center border-border">
            <MainIcon className="h-5 w-5 text-foreground" />
          </span>
          <span className="text-sm font-semibold text-foreground">Acrobate</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Material Symbols theme toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
