"use client"

import { cn } from "@/lib/utils"

interface AuroraGradientProps {
  className?: string
}

/**
 * Adobe-ish AuroraGradient
 * - Red & white blobs + a soft diagonal beam
 * - Auto-tuned for dark mode (dims white so it doesn't wash out)
 */
export function AuroraGradient({ className }: AuroraGradientProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      aria-hidden="true"
    >
      <span className="aurora__blob aurora__blob--red" />
      <span className="aurora__blob aurora__blob--white" />
      <span className="aurora__blob aurora__blob--crimson" />
      <span className="aurora__beam" />

      <style jsx>{`
        .aurora__blob {
          position: absolute;
          width: 60vw;
          height: 60vw;
          border-radius: 9999px;
          /* A bit more blur for softer edges */
          filter: blur(70px);
          opacity: 0.65;
          /* Good blending for both themes, with wide support */
          mix-blend-mode: screen;
        }

        /* Diagonal "beam" that hints at the Adobe slash */
        .aurora__beam {
          position: absolute;
          left: -10%;
          right: -10%;
          top: -12%;
          height: 40%;
          transform: rotate(-8deg);
          background: linear-gradient(
            90deg,
            rgba(255, 0, 0, 0.12),
            rgba(255, 255, 255, 0.65) 40%,
            rgba(255, 0, 0, 0.12) 80%
          );
          filter: blur(40px);
          opacity: 0.7;
          mix-blend-mode: screen;
        }

        /* Blobs (Adobe reds + white) — swap to #ff0000 for pure brand red */
        .aurora__blob--red {
          background: radial-gradient(
            closest-side,
            rgba(239, 68, 68, 0.95),
            rgba(239, 68, 68, 0) 60%
          );
          top: -12%;
          left: -8%;
          animation: drift1 28s ease-in-out infinite alternate;
        }

        .aurora__blob--white {
          background: radial-gradient(
            closest-side,
            rgba(255, 255, 255, 0.9),
            rgba(255, 255, 255, 0) 60%
          );
          right: -15%;
          top: 5%;
          animation: drift2 32s ease-in-out infinite alternate;
        }

        .aurora__blob--crimson {
          background: radial-gradient(
            closest-side,
            rgba(220, 38, 38, 0.9),
            rgba(220, 38, 38, 0) 60%
          );
          bottom: -18%;
          left: 30%;
          animation: drift3 36s ease-in-out infinite alternate;
        }

        /* Motion */
        @keyframes drift1 {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          }
          100% {
            transform: translate3d(6%, 4%, 0) rotate(10deg) scale(1.05);
          }
        }
        @keyframes drift2 {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          }
          100% {
            transform: translate3d(-8%, 6%, 0) rotate(-8deg) scale(1.08);
          }
        }
        @keyframes drift3 {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          }
          100% {
            transform: translate3d(4%, -6%, 0) rotate(6deg) scale(1.04);
          }
        }

        /* Dark mode tuning: soften whites so they don't overpower */
        :global(html.dark) .aurora__blob {
          filter: blur(90px);
        }
        :global(html.dark) .aurora__blob--white {
          opacity: 0.35;
          background: radial-gradient(
            closest-side,
            rgba(255, 255, 255, 0.35),
            rgba(255, 255, 255, 0) 60%
          );
        }
        :global(html.dark) .aurora__beam {
          opacity: 0.45;
          background: linear-gradient(
            90deg,
            rgba(239, 68, 68, 0.25),
            rgba(255, 255, 255, 0.35) 40%,
            rgba(239, 68, 68, 0.25) 80%
          );
        }
      `}</style>
    </div>
  )
}
