import "server-only";

import type { ChildProcess } from "child_process"
import { spawn } from "child_process"

type RunState = {
  running: boolean
  runId: string | null
  startedAt: number | null
  endedAt: number | null
  lastExitCode: number | null
}

let currentChild: ChildProcess | null = null
let state: RunState = {
  running: false,
  runId: null,
  startedAt: null,
  endedAt: null,
  lastExitCode: null,
}

export function getRunState(): RunState {
  return { ...state }
}

export function setRunning(runId: string) {
  state = {
    running: true,
    runId,
    startedAt: Date.now(),
    endedAt: null,
    lastExitCode: null,
  }
}

export function setStopped(code: number | null) {
  state = {
    ...state,
    running: false,
    endedAt: Date.now(),
    lastExitCode: code ?? null,
  }
  currentChild = null
}

function killProcessTreeWin(pid: number): Promise<void> {
  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/pid", String(pid), "/t", "/f"], {
      windowsHide: true,
      shell: true,
    })
    killer.on("close", () => resolve())
    killer.on("error", () => resolve())
  })
}

export async function killCurrentProcess(): Promise<void> {
  if (!currentChild) return
  const pid = currentChild.pid
  if (!pid) {
    try {
      currentChild.kill()
    } catch {}
    currentChild = null
    state.running = false
    return
  }

  if (process.platform === "win32") {
    await killProcessTreeWin(pid)
  } else {
    try {
      currentChild.kill("SIGTERM")
    } catch {}

    setTimeout(() => {
      try {
        if (currentChild) currentChild.kill("SIGKILL")
      } catch {}
    }, 1500)
  }
  currentChild = null
  state.running = false
}

export function setCurrentChild(child: ChildProcess | null) {
  currentChild = child
}

export function getCurrentChild(): ChildProcess | null {
  return currentChild
}
