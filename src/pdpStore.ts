import { useSyncExternalStore } from 'react'
import type { EnhancedSceneBrief } from './types'
import type { Api, RenderJob } from './api'
import { isTerminalStatus } from './api'
import { renderCache } from './renderCache'

const RENDER_TIMEOUT_MS = 45_000

export interface PDPSnapshot {
  brief: EnhancedSceneBrief | null
  renderJob: RenderJob | null
  renderTimedOut: boolean
}

export type PDPStore = ReturnType<typeof createPDPStore>

// Central state for a PDP page — shared between PDPWidget (CTA bar) and
// CarouselWidget so both stay in sync and only one render job is created.
export function createPDPStore(api: Api, productHandle: string, productTitle: string, shopDomain: string) {
  let state: PDPSnapshot = { brief: null, renderJob: null, renderTimedOut: false }
  let activeBriefId: string | null = null
  let sseCleanup: (() => void) | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const listeners = new Set<() => void>()

  function notify() { for (const fn of listeners) fn() }
  function getSnapshot() { return state }
  function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
  function usePDPStore() { return useSyncExternalStore(subscribe, getSnapshot) }

  function clearWatcher() {
    sseCleanup?.(); sseCleanup = null
    if (timeoutId !== null) { clearTimeout(timeoutId); timeoutId = null }
  }

  function watchJob(job: RenderJob, brief: EnhancedSceneBrief, onSucceeded?: (jobId: string) => void) {
    timeoutId = setTimeout(() => {
      state = { ...state, renderTimedOut: true }
      notify()
    }, RENDER_TIMEOUT_MS)

    sseCleanup = api.watchRenderJob(job.jobId, (updated) => {
      const terminal = isTerminalStatus(updated.status)
      state = { ...state, renderJob: updated, ...(terminal ? { renderTimedOut: false } : {}) }
      notify()
      if (terminal) {
        clearWatcher()
        if (updated.status === 'succeeded') {
          renderCache.set(productHandle, brief.id, updated)
          onSucceeded?.(updated.jobId)
        }
      }
    })
  }

  async function submitRenderJob(brief: EnhancedSceneBrief, timing?: { briefMs: number; t1: number }) {
    const cached = renderCache.get(productHandle, brief.id)
    if (cached) {
      state = { ...state, renderJob: cached, renderTimedOut: false }
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
      state = { ...state, renderJob: job, renderTimedOut: false }
      notify()

      const pollStart = Date.now()
      function onSucceeded(jobId: string) {
        if (!timing) return
        const pollWaitMs = Date.now() - pollStart
        api.reportRenderTiming(jobId, {
          briefMs: timing.briefMs,
          submitMs,
          pollWaitMs,
          totalClientMs: timing.briefMs + submitMs + pollWaitMs,
        })
      }

      if (job.status === 'succeeded') {
        renderCache.set(productHandle, brief.id, job)
        onSucceeded(job.jobId)
      } else if (!isTerminalStatus(job.status)) {
        watchJob(job, brief, onSucceeded)
      }
    } catch (err) {
      console.error('[VIR] createRenderJob failed:', err)
    }
  }

  async function setBrief(brief: EnhancedSceneBrief | null, timing?: { briefMs: number; t1: number }) {
    if (brief?.id === activeBriefId) return
    clearWatcher()
    activeBriefId = brief?.id ?? null
    state = { brief, renderJob: null, renderTimedOut: false }
    notify()
    if (brief) await submitRenderJob(brief, timing)
  }

  async function retryRender() {
    const { brief } = state
    if (!brief) return
    clearWatcher()
    state = { ...state, renderJob: null, renderTimedOut: false }
    notify()
    await submitRenderJob(brief)
  }

  function hydrate(brief: EnhancedSceneBrief, renderJob: RenderJob) {
    clearWatcher()
    activeBriefId = brief.id
    state = { brief, renderJob, renderTimedOut: false }
    notify()
    if (renderJob.status === 'succeeded') {
      renderCache.set(productHandle, brief.id, renderJob)
    } else if (!isTerminalStatus(renderJob.status)) {
      watchJob(renderJob, brief)
    }
  }

  function clear() {
    clearWatcher()
    activeBriefId = null
    state = { brief: null, renderJob: null, renderTimedOut: false }
    notify()
  }

  return { usePDPStore, setBrief, retryRender, hydrate, clear }
}
