import { useSyncExternalStore } from 'react'
import type { EnhancedSceneBrief } from './types'
import type { Api, RenderJob } from './api'
import { isTerminalStatus } from './api'
import { renderCache } from './renderCache'

export interface PDPSnapshot {
  brief: EnhancedSceneBrief | null
  renderJob: RenderJob | null
}

export type PDPStore = ReturnType<typeof createPDPStore>

// Central state for a PDP page — shared between PDPWidget (CTA bar) and
// CarouselWidget so both stay in sync and only one render job is created.
export function createPDPStore(api: Api, productHandle: string, productTitle: string, shopDomain: string) {
  let state: PDPSnapshot = { brief: null, renderJob: null }
  let activeBriefId: string | null = null
  let sseCleanup: (() => void) | null = null

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

  async function setBrief(brief: EnhancedSceneBrief | null, timing?: { briefMs: number; t1: number }) {
    if (brief?.id === activeBriefId) return

    sseCleanup?.(); sseCleanup = null
    activeBriefId = brief?.id ?? null
    state = { brief, renderJob: null }
    notify()

    if (!brief) return

    const cached = renderCache.get(productHandle, brief.id)
    if (cached) {
      state = { brief, renderJob: cached }
      notify()
      return
    }

    try {
      const submitStart = timing?.t1 ?? Date.now()
      const job = await api.createRenderJob({
        briefId: brief.id,
        productId: productHandle,
        shopDomain,
        product: { title: productTitle, material: '', cabinetColor: '' },
      })
      const submitMs = Date.now() - submitStart
      state = { ...state, renderJob: job }
      notify()

      const pollStart = Date.now()

      function onSucceeded(jobId: string) {
        if (!timing) return
        const pollWaitMs = Date.now() - pollStart
        const totalClientMs = timing.briefMs + submitMs + pollWaitMs
        api.reportRenderTiming(jobId, { briefMs: timing.briefMs, submitMs, pollWaitMs, totalClientMs })
      }

      if (job.status === 'succeeded') {
        renderCache.set(productHandle, brief.id, job)
        onSucceeded(job.jobId)
      } else if (!isTerminalStatus(job.status)) {
        sseCleanup = api.watchRenderJob(job.jobId, (updated) => {
          state = { ...state, renderJob: updated }
          notify()
          if (isTerminalStatus(updated.status)) {
            sseCleanup = null
            if (updated.status === 'succeeded') {
              renderCache.set(productHandle, brief.id, updated)
              onSucceeded(updated.jobId)
            }
          }
        })
      }
    } catch (err) {
      console.error('[VIR] createRenderJob failed:', err)
    }
  }

  function hydrate(brief: EnhancedSceneBrief, renderJob: RenderJob) {
    sseCleanup?.(); sseCleanup = null
    activeBriefId = brief.id
    state = { brief, renderJob }
    notify()
    if (renderJob.status === 'succeeded') {
      renderCache.set(productHandle, brief.id, renderJob)
    } else if (!isTerminalStatus(renderJob.status)) {
      sseCleanup = api.watchRenderJob(renderJob.jobId, (updated) => {
        state = { ...state, renderJob: updated }
        notify()
        if (isTerminalStatus(updated.status)) {
          sseCleanup = null
          if (updated.status === 'succeeded') renderCache.set(productHandle, brief.id, updated)
        }
      })
    }
  }

  function clear() {
    sseCleanup?.(); sseCleanup = null
    activeBriefId = null
    state = { brief: null, renderJob: null }
    notify()
  }

  return { usePDPStore, setBrief, hydrate, clear }
}
