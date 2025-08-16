import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          {"© "}
          {new Date().getFullYear()} DocMind. All rights reserved.
        </p>
        <nav className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="#" className="hover:underline underline-offset-4">
            Terms
          </Link>
          <Link href="#" className="hover:underline underline-offset-4">
            Privacy
          </Link>
          <Link href="#" className="hover:underline underline-offset-4">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  )
}
