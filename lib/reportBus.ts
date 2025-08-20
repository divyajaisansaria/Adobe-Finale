"use client"
const target = new EventTarget()
const NEW_RUN_EVENT = "model2:new-run"

export function emitNewRun() {
  target.dispatchEvent(new Event(NEW_RUN_EVENT))
}

export function onNewRun(handler: () => void) {
  const fn = () => handler()
  target.addEventListener(NEW_RUN_EVENT, fn)
  return () => target.removeEventListener(NEW_RUN_EVENT, fn)
}
