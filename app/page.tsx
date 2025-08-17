"use client" // 1. Convert to a Client Component

import { useState, useEffect } from "react" // 2. Import hooks
import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { FeaturesExact } from "@/components/feature-cards"
import { Showcase } from "@/components/showcase"
import { FAQ } from "@/components/faq"
import { SiteFooter } from "@/components/site-footer"
import { Loader } from "@/components/ui/loader"

export default function Page() {
  // 3. Set up the loading state
  const [isLoading, setIsLoading] = useState(true);

  // 4. Simulate loading and then turn it off
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Loader will show for 2 seconds

    return () => clearTimeout(timer); // Cleanup timer
  }, []); // The empty array means this effect runs once on mount

  // 5. Conditionally render the loader or the page content
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader label="Loading your files..." size={120} />
      </div>
    );
  }

  return (
    <div className="app-bg flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <FeaturesExact />
        <Showcase />
        <FAQ />
      </main>
      <SiteFooter />
    </div>
  )
}