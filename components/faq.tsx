import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FAQ() {
  const faqs = [
    {
      q: "What file types are supported?",
      a: "You can upload PDFs, Word documents, PowerPoint slides, spreadsheets (CSV), and add web links. More formats are coming soon.",
    },
    {
      q: "Are answers cited?",
      a: "Yes. Responses include citations with links or quotes back to your exact sources so you can verify.",
    },
    {
      q: "Is my data private?",
      a: "Your sources are private by default. You choose what to share and with whom. We never use your data to train third‑party models.",
    },
    {
      q: "Do you have a free plan?",
      a: "We offer a generous free tier while in beta. Paid plans with higher limits will be available at launch.",
    },
  ]

  return (
    <section id="faq" className="border-t py-12 md:py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          <p className="mt-2 text-muted-foreground">Everything you need to know about the product and billing.</p>
        </div>
        <Accordion type="single" collapsible className="mt-6">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
