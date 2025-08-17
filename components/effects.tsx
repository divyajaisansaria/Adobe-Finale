"use client"

import React from 'react'

export function ScrollRestoration() {
  React.useEffect(() => {
    // This tells the browser to let your app handle scrolling
    if (window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return null; // This component renders nothing to the page
}