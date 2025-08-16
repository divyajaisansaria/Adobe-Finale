"use client"

import * as React from "react"
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps & { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"            // put "dark" class on <html>
      defaultTheme="system"        // follow OS by default
      enableSystem                 // allow system theme
      disableTransitionOnChange    // avoid flicker
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
