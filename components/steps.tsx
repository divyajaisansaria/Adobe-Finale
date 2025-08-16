import Image from "next/image"

export function Steps() {
  const steps = [
    {
      step: "1",
      title: "Add your sources",
      desc: "Upload documents or paste links. We parse and prepare your library securely.",
      img: "/upload-files-ui-cards.png",
    },
    {
      step: "2",
      title: "Ask questions",
      desc: "Get grounded answers with citations. Follow-up for deeper insights.",
      img: "/chat-with-documents-ui.png",
    },
    {
      step: "3",
      title: "Summarize and share",
      desc: "Create summaries, outlines, and overviews ready to export.",
      img: "/summary-outline-ui.png",
    },
  ]

  return (
    <section id="how" className="bg-muted/40 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-2 text-muted-foreground">Three simple steps to go from sources to understanding.</p>
        </div>
        <ol className="mx-auto mt-8 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => (
            <li key={s.step} className="rounded-xl border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-600 text-xs font-semibold text-white">
                  {s.step}
                </span>
                <h3 className="font-medium">{s.title}</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">{s.desc}</p>
                <Image
                  src={s.img || "/placeholder.svg"}
                  alt={s.title}
                  width={420}
                  height={220}
                  className="mt-3 h-[220px] w-full rounded-md border object-cover"
                />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
