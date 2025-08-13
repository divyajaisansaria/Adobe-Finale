"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NotebookPen } from "lucide-react"
import MainIcon from "@/assets/icons/Icon.svg"
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Home">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border">
            <MainIcon></MainIcon>
          </span>
          <span className="text-sm font-semibold">Acrobate</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          <Link href="#overview" className="text-sm text-muted-foreground hover:text-foreground">
            Overview
          </Link>
          <Link href="#plans" className="text-sm text-muted-foreground hover:text-foreground">
            Plans
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="h-9 rounded-full px-4 bg-transparent">
            <Link href="#app">Get the app</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
