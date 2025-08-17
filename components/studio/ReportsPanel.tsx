// components/studio/ReportsPanel.tsx
"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
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

      {reports.length > 0 && (
        <>
          {reports.map((report, index) => (
            <div key={index} className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                {report.source_file}
              </h3>
              {report.sections.map((section, secIndex) => (
                <div key={secIndex} className="bg-muted/20 p-3 rounded-lg text-sm">
                  <h4 className="font-semibold text-muted-foreground mb-1">{section.section_title}</h4>
                  <p className="text-foreground/80 whitespace-pre-wrap">{section.refined_text}</p>
                </div>
              ))}
            </div>
          ))}

          {isLoadingReports && (
            <div className="flex items-center justify-start p-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Watching for new outputs…</span>
            </div>
          )}
        </>
      )}

      {/* Only show the empty state if a cycle actually ended */}
      {!isLoadingReports && reports.length === 0 && !reportsError && endedRef.current && (
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <p>No reports found. The Python script may not have run yet.</p>
        </div>
      )}
    </div>
  )
}
