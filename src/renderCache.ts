import type { RenderJob } from './api'

const PREFIX = 'vir:'

export const renderCache = {
  get(productId: string, briefId: string): RenderJob | null {
    try {
      const raw = sessionStorage.getItem(`${PREFIX}${productId}:${briefId}`)
      return raw ? (JSON.parse(raw) as RenderJob) : null
    } catch {
      return null
    }
  },

  set(productId: string, briefId: string, job: RenderJob): void {
    try {
      sessionStorage.setItem(`${PREFIX}${productId}:${briefId}`, JSON.stringify(job))
    } catch { /* quota full — ignore */ }
  },
}
