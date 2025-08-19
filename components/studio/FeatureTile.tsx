"use client"

import * as React from "react"

// Define the animation keyframes as a string.
// This keeps the JSX clean.
const shimmerAnimation = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`

export function FeatureTile({
  icon,
  label,
  onClick,
  bgColor,
  isLoading = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  bgColor: string
  isActive?: boolean
  isLoading?: boolean
}) {
  const needsLoadingSpinner = (label === "Summary" || label === "Relevant Section" || label==="Podcast") && isLoading
  return (
    <>
      {/* STEP 1: Inject the keyframes directly into the page's styles.
          This makes the 'shimmer' animation available for Tailwind to use. */}
      <style>{shimmerAnimation}</style>

      <div
        onClick={onClick}
        // overflow-hidden is crucial to contain the shimmer effect.
        className={`relative rounded-xl p-4 flex flex-col gap-2.5 cursor-pointer transition-colors text-white/90 overflow-hidden ${bgColor}`}
      >
        {needsLoadingSpinner && (
          <div
            className="absolute inset-0 
              bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)]
              // STEP 2: Use Tailwind's arbitrary value syntax to run the animation
              // we defined in the style tag above.
              animate-[shimmer_2s_infinite]"
          />
        )}

        {/* The content is set to z-10 to ensure it appears on top of the shimmer. */}
        <div className="relative z-10">
          {React.cloneElement(icon as React.ReactElement, {
            className: `h-5 w-5 text-white/80`,
          })}
        </div>

        <span className="relative z-10 text-sm font-medium">{label}</span>
      </div>
    </>
  )
}