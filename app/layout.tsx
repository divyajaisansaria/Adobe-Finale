import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Pdf',
  description: 'Created with love',
  generator: 'shashank',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
        
        {/* --- ADD THIS LINE FOR GOOGLE ICONS --- */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body>
        {children}
        
        <Script
  src="https://acrobatservices.adobe.com/view-sdk/viewer.js"
  strategy="afterInteractive"
/>
      </body>
    </html>
  )
}