import { useSyncExternalStore } from 'react'
import type { EnhancedSceneBrief } from './types'
import type { Api, RenderJob } from './api'
import { isTerminalStatus } from './api'

export interface PDPSnapshot {
  brief: EnhancedSceneBrief | null
  renderJob: RenderJob | null
}

export type PDPStore = ReturnType<typeof createPDPStore>

// Central state for a PDP page — shared between PDPWidget (CTA bar) and
// CarouselWidget so both stay in sync and only one render job is created.
export function createPDPStore(api: Api, productHandle: string, productTitle: string) {
  let state: PDPSnapshot = { brief: null, renderJob: null }
  let activeBriefId: string | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null

  const listeners = new Set<() => void>()

  function notify() { for (const fn of listeners) fn() }

  function getSnapshot() { return state }

  function subscribe(fn: () => void) {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }

  function usePDPStore() {
    return useSyncExternalStore(subscribe, getSnapshot)
  }

  async function setBrief(brief: EnhancedSceneBrief | null) {
    if (brief?.id === activeBriefId) return

    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
    activeBriefId = brief?.id ?? null
    state = { brief, renderJob: null }
    notify()

    if (!brief) return

    try {
      const job = await api.createRenderJob({
        briefId: brief.id,
        productId: productHandle,
        product: { title: productTitle, material: '', cabinetColor: '' },
      })
      state = { ...state, renderJob: job }
      notify()

      if (!isTerminalStatus(job.status)) {
        pollTimer = setInterval(async () => {
          try {
            const updated = await api.getRenderJob(job.jobId)
            state = { ...state, renderJob: updated }
            notify()
            if (isTerminalStatus(updated.status)) {
              clearInterval(pollTimer!)
              pollTimer = null
            }
          } catch { /* ignore */ }
        }, 3000)
      }
    } catch (err) {
      console.error('[VIR] createRenderJob failed:', err)
    }
  }

  function clear() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
    activeBriefId = null
    state = { brief: null, renderJob: null }
    notify()
  }

  return { usePDPStore, setBrief, clear }
}
