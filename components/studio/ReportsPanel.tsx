"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import type { ReportFile } from "./types"

export function ReportsPanel({
  onLoadingChange,
  pollDurationSec = 50,
  maxReports = 3,
}: {
  onLoadingChange?: (loading: boolean) => void
  pollDurationSec?: number
  maxReports?: number
}) {
  const [reports, setReports] = useState<ReportFile[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let knownFiles: string[] = []
    let count = 0
    const start = Date.now()

    const startPolling = () => {
      setIsLoadingReports(true)
      setReportsError(null)
      setReports([])
      onLoadingChange?.(true)

      const poll = async () => {
        try {
          const params = new URLSearchParams({ known: knownFiles.join(",") })
          const res = await fetch(`/api/reports?${params}`)
          if (!res.ok) throw new Error("Failed to fetch reports")
          const data = await res.json()

          if (data.newReports?.length) {
            setReports((prev) => {
              const prevJson = JSON.stringify(prev)
              const toAppend = data.newReports.filter(
                (r: ReportFile) => !prevJson.includes(JSON.stringify(r))
              )
              return toAppend.length ? [...prev, ...toAppend] : prev
            })

            knownFiles = [...knownFiles, ...(data.newFiles || [])]
            count += data.newReports.length
          }

          const elapsed = (Date.now() - start) / 1000
          if (elapsed >= pollDurationSec || count >= maxReports) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            setIsLoadingReports(false)
            onLoadingChange?.(false)
          }
        } catch (err: any) {
          setReportsError(err.message || "Polling error")
          if (intervalRef.current) clearInterval(intervalRef.current)
          setIsLoadingReports(false)
          onLoadingChange?.(false)
        }
      }

      intervalRef.current = setInterval(poll, 2000)
      poll()
    }

    startPolling()

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      onLoadingChange?.(false)
    }
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

      {!isLoadingReports && reports.length === 0 && !reportsError && (
        <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <p>No reports found. The Python script may not have run yet.</p>
        </div>
      )}
    </div>
  )
}
