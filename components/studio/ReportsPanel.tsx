// components/studio/ReportsPanel.tsx
"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { ReportFile } from "./types"
import { onNewRun } from "@/lib/reportBus"

export function ReportsPanel({
  onLoadingChange,
  pollDurationSec = 50,
}: {
  onLoadingChange?: (loading: boolean) => void
  pollDurationSec?: number
}) {
  const [reports, setReports] = useState<ReportFile[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [reportsError, setReportsError] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track what we've already seen / state for the current cycle
  const knownFilesRef = useRef<string[]>([])
  const startRef = useRef<number>(0)
  const cycleIdRef = useRef<number>(0)              // invalidate older polling cycles
  const sawRunningRef = useRef<boolean>(false)      // becomes true once API reports running=true
  const idleStrikesRef = useRef<number>(0)          // counts consecutive polls where running=false
  const endedRef = useRef<boolean>(false)           // marks that a cycle actually ended (for empty UI)

  // Tunables
  const POLL_MS = 2000
  const MAX_IDLE_STRIKES = 5                        // ~10s (5 * 2s) grace before declaring "no run"

  // -------- UI state/helpers (from the new UI) --------
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggleExpanded = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const prettyName = (name: string) => name.replace(/_/g, " ")

  // Prefer a unique JSON filename/id if present; otherwise make a stable fingerprint
  const getReportId = (r: ReportFile, idx: number) => {
    const anyR = r as any
    const jsonId =
      anyR.json_file ||
      anyR.json_filename ||
      anyR.output_file ||
      anyR.id
    if (jsonId) return String(jsonId)

    // fallback: stable-ish fingerprint so identical boxes don't all open
    const sig = JSON.stringify({
      src: r.source_file ?? "",
      secs: (r.sections ?? []).map(s => [s.section_title ?? "", (s.refined_text ?? "").length]),
    })
    let h = 0
    for (let i = 0; i < sig.length; i++) {
      h = ((h << 5) - h) + sig.charCodeAt(i)
      h |= 0
    }
    return `auto_${Math.abs(h)}_${idx}`
  }

  const primaryIndexOf = (r: ReportFile) => {
    const i = r.sections?.findIndex(x => (x?.refined_text || "").trim().length > 0)
    return (i !== undefined && i !== null && i >= 0) ? i : 0
  }
  // ----------------------------------------------------

  // ---- OLD LOGIC: DO NOT CHANGE ----
  const stopPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current)
    startTimeoutRef.current = null
    setIsLoadingReports(false)
    onLoadingChange?.(false)
    endedRef.current = true
  }

  const resetState = () => {
    cycleIdRef.current += 1
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current)
    startTimeoutRef.current = null

    knownFilesRef.current = []
    startRef.current = Date.now()
    sawRunningRef.current = false
    idleStrikesRef.current = 0
    endedRef.current = false

    setReports([])
    setReportsError(null)
    setIsLoadingReports(true)
    onLoadingChange?.(true)
  }

  const startPolling = (delayMs: number = 0) => {
    resetState()
    const myCycle = cycleIdRef.current

    const poll = async () => {
      if (myCycle !== cycleIdRef.current) return

      try {
        const params = new URLSearchParams({ known: knownFilesRef.current.join(",") })
        const res = await fetch(`/api/reports?${params}`, { method: "GET" })
        if (!res.ok) throw new Error("Failed to fetch reports")
        const data: { newReports?: ReportFile[]; newFiles?: string[]; running?: boolean } = await res.json()

        const newReports = data.newReports ?? []
        const newFiles = data.newFiles ?? []
        const running = !!data.running

        // Track running/idle state across polls
        if (running) {
          sawRunningRef.current = true
          idleStrikesRef.current = 0
        } else {
          idleStrikesRef.current += 1
        }

        // Append any brand-new reports we haven't shown yet
        if (newReports.length) {
          setReports((prev) => {
            const prevJson = JSON.stringify(prev)
            const toAppend = newReports.filter((r) => !prevJson.includes(JSON.stringify(r)))
            if (toAppend.length) {
              // Mark cycle as ongoing (not ended)
              endedRef.current = false
              return [...prev, ...toAppend]
            }
            return prev
          })
          if (newFiles.length) {
            knownFilesRef.current = [...knownFilesRef.current, ...newFiles]
          }
        }

        // Decide when to stop:
        // - Hard timeout
        // - We've seen running previously and now it's not running anymore (job ended)
        // - Or we've been idle for a while at the start (grace for back-end to flip to running)
        const elapsed = (Date.now() - startRef.current) / 1000
        const timeUp = elapsed >= pollDurationSec
        const jobEnded = sawRunningRef.current && !running
        const idleTooLongInitially = !sawRunningRef.current && idleStrikesRef.current >= MAX_IDLE_STRIKES

        if (timeUp || jobEnded || idleTooLongInitially) {
          stopPolling()
        }
      } catch (err: any) {
        setReportsError(err.message || "Polling error")
        stopPolling()
      }
    }

    // Start after an optional initial delay (to let your backend clear/create the output dir)
    if (delayMs > 0) {
      startTimeoutRef.current = setTimeout(() => {
        if (myCycle !== cycleIdRef.current) return
        intervalRef.current = setInterval(poll, POLL_MS)
        void poll()
      }, delayMs)
    } else {
      intervalRef.current = setInterval(poll, POLL_MS)
      void poll()
    }
  }

  // Start polling immediately when the panel mounts,
  // but thanks to the improved stop conditions this won't "finish" too early.
  useEffect(() => {
    startPolling(0)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current)
      onLoadingChange?.(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When a NEW selection triggers a fresh run, wait 5s before the first check
  useEffect(() => {
    const off = onNewRun(() => {
      startPolling(5000) // 5-second grace period after selection
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // ---- END OLD LOGIC ----

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {reportsError && (
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-red-500">
          <p>⚠️ {reportsError}</p>
        </div>
      )}

      {reports.length === 0 && isLoadingReports && (
        <div className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Waiting for first output…</span>
        </div>
      )}

      {/* New expandable UI (pure presentation, no logic changes) */}
      <div className="space-y-3">
        <AnimatePresence initial={true}>
          {reports.map((report, idx) => {
            const id = getReportId(report, idx)
            const open = !!expanded[id]
            const pIdx = primaryIndexOf(report)
            const primary = report.sections?.[pIdx] ?? { section_title: "—", refined_text: "" }
            const displayFile = prettyName(report.source_file ?? "report.json")

            return (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 6, filter: "blur(3px)" }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="w-full"
              >
                {/* The whole card is the button; it expands as one piece */}
                <div
                  role="button"
                  aria-expanded={open}
                  onClick={() => toggleExpanded(id)}
                  className={[
                    "w-full rounded-xl border border-neutral-700 bg-card/60 hover:bg-accent/10 hover:border-neutral-600",
                    "shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500/40",
                    "px-4 py-3 cursor-pointer"
                  ].join(" ")}
                >
                  {/* File name – full wrap, not truncated */}
                  <h3 className="text-base font-semibold text-foreground break-words">
                    {displayFile}
                  </h3>

                  {/* Heading – slightly lighter than filename */}
                  <div className="mt-0.5 text-sm font-medium text-muted-foreground">
                    {primary.section_title || "Extracted section"}
                  </div>

                  {/* Primary text: clamps when closed, continues when open */}
                  <div
                    className="mt-2 text-sm font-light text-foreground/65"
                    style={
                      open
                        ? { whiteSpace: "pre-wrap" }
                        : {
                            display: "-webkit-box",
                            WebkitLineClamp: 2 as any,
                            WebkitBoxOrient: "vertical" as any,
                            overflow: "hidden",
                          }
                    }
                  >
                    {primary.refined_text || "—"}
                  </div>

                  {/* Read more button (collapsed state only) */}
                  {!open && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleExpanded(id) }}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900/90 px-2.5 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500/40"
                      >
                        <span>Read more</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Expanded area: additional sections (skip the primary header/duplication) */}
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        layout
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                          {report.sections?.map((section, sidx) => {
                            if (sidx === pIdx) return null // don't repeat the primary
                            return (
                              <div key={sidx} className={sidx > 0 ? "mt-3 pt-3 border-t border-border/60" : ""}>
                                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                                  {section.section_title || `Section ${sidx + 1}`}
                                </h4>
                                <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                                  {section.refined_text || "—"}
                                </p>
                              </div>
                            )
                          })}
                        </div>

                        {/* Collapse button lives at the very end when open */}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExpanded(id) }}
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-900/90 px-2.5 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-500/40"
                          >
                            <span>Collapse</span>
                            <ChevronUp className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {reports.length > 0 && isLoadingReports && (
        <div className="flex items-center justify-start p-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs text-muted-foreground">Watching for new outputs…</span>
        </div>
      )}

      {/* Only show the empty state if a cycle actually ended */}
      {!isLoadingReports &&
      reports.length === 0 &&
      !reportsError &&
      endedRef.current &&
      sawRunningRef.current && (
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <p>No reports found. The Python script may not have run yet.</p>
        </div>
      )}

    </div>
  )
}
