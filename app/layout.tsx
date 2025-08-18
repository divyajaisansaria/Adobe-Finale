import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import Script from 'next/script'
import { ThemeProvider } from '@/components/theme-provider'
import { ScrollRestoration } from '@/components/effects'
export const metadata: Metadata = {
  title: 'Pdf',
  description: 'Created with love',
  generator: 'shashank',
}
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      style={{ fontFamily: GeistSans.style.fontFamily }}
    >
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body>
        <ThemeProvider
        attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="ui-theme"   // <- important: consistent key
        >
          <div id="page-scale-wrapper">
            {children}
          </div>
        </ThemeProvider>
        <ScrollRestoration />
        <Script src="https://acrobatservices.adobe.com/view-sdk/viewer.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
