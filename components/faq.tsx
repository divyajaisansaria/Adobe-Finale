import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FAQ() {
  const faqs = [
    {
      q: "How to Run Relevant Section?",
      a: "You can Run Relevant Section just by selecting the Text in a PDF",
    },
    {
      q: "Is there ChatBot?",
      a: "Yes, There is Feature of ChatBot.",
    },
    {
      q: "Is my data private?",
      a: "Your sources are private by default. You choose what to share and with whom. We never use your data to train third‑party models.",
    },
    {
      q: "How to see Insights ?",
      a: "Insight bulb can be activated by selecting the text and clicking on the bulb icon.",
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
