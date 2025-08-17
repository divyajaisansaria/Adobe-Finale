"use client"

import * as React from "react"

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
  const needsLoadingSpinner = (label === "Summary" || label === "Reports") && isLoading

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl p-4 flex flex-col gap-2.5 cursor-pointer transition-colors text-white/90 ${bgColor}`}
    >
      {needsLoadingSpinner && (
        <div
          className="absolute inset-0 rounded-xl 
            bg-[conic-gradient(from_0deg,theme(colors.blue.400),theme(colors.purple.500),theme(colors.pink.500),theme(colors.blue.400))]
            animate-[spin_3s_linear_infinite]
            opacity-60
            z-10
            pointer-events-none"
        />
      )}

      <div className="relative z-20">
        {React.cloneElement(icon as React.ReactElement, {
          className: `h-5 w-5 text-white/80`,
        })}
      </div>

      <span className="relative z-20 text-sm font-medium">{label}</span>
    </div>
  )
}
