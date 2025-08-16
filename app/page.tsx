import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { FeaturesExact } from "@/components/feature-cards"
import { Steps } from "@/components/steps"
import { Showcase } from "@/components/showcase"
import { FAQ } from "@/components/faq"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    // The `app-bg` class has been added here
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