import type { RoomProfile, QuickAction, QuickActionId, EnhancedSceneBrief, WidgetProduct } from './types'

export interface AppearanceSettings {
  accentColor: string
  accentTextColor: string
  collectionCtaHeading: string
  collectionCtaSubtext: string
  collectionCtaButton: string
  pdpCtaHeading: string
  pdpCtaSubtext: string
  pdpCtaButton: string
  recsTitle: string
  recsRoomBadge: string
  recsInjectionSelector?: string
  recsInjectionPosition?: 'before' | 'after' | 'inside'
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  accentColor: '#2563EB',
  accentTextColor: '#ffffff',
  collectionCtaHeading: 'See these in your room',
  collectionCtaSubtext: 'Visualize any piece in your actual space — free, instant preview',
  collectionCtaButton: 'Get started',
  pdpCtaHeading: 'See this in your room',
  pdpCtaSubtext: 'Free instant preview — no app needed',
  pdpCtaButton: 'Try it',
  recsTitle: 'You may also like',
  recsRoomBadge: 'In your room',
}

const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' }

export async function fetchAppearanceSettings(backofficeUrl: string, shopDomain: string): Promise<AppearanceSettings> {
  try {
    const res = await fetch(`${backofficeUrl}/api/public/appearance?shop=${encodeURIComponent(shopDomain)}`, { headers: NGROK_HEADERS })
    if (!res.ok) return { ...DEFAULT_APPEARANCE }
    return { ...DEFAULT_APPEARANCE, ...await res.json() as Partial<AppearanceSettings> }
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

export interface RenderJob {
  jobId: string
  briefId: string
  status: 'submitted' | 'processing' | 'succeeded' | 'failed'
  imageUrl: string | null
  error: string | null
}

export function isTerminalStatus(status: RenderJob['status']): boolean {
  return status === 'succeeded' || status === 'failed'
}

export function createApi(baseUrl: string) {
  async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}/api${path}`, {
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      ...init,
    })
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
    return res.json() as Promise<T>
  }

  // Relative imageUrl values from the server must be resolved against baseUrl,
  // since the widget runs on the merchant's Shopify domain, not the API host.
  function resolveJob(job: RenderJob): RenderJob {
    if (job.imageUrl && job.imageUrl.startsWith('/')) {
      return { ...job, imageUrl: `${baseUrl}${job.imageUrl}` }
    }
    return job
  }

  return {
    getRooms: () =>
      req<{ rooms: RoomProfile[] }>('/rooms').then(r => r.rooms),

    uploadRoom: (body: { imageDataUrl: string; filename: string; productCategory?: string | null }) =>
      req<{ room: RoomProfile; actions: QuickAction[] }>('/rooms/upload', { method: 'POST', body: JSON.stringify(body) }),

    analyzeRoom: (roomId: string, body: { productCategory?: string | null } = {}) =>
      req<{ actions: QuickAction[] }>(`/rooms/${roomId}/analysis`, { method: 'POST', body: JSON.stringify(body) })
        .then(r => r.actions),

    getSceneBrief: (briefId: string) =>
      req<{ brief: EnhancedSceneBrief }>(`/scene-briefs/${briefId}`).then(r => r.brief),

    createSceneBrief: (body: { roomId: string; actionId: QuickActionId; refinementText: string; collectionName: string }) =>
      req<{ brief: EnhancedSceneBrief }>('/scene-briefs', { method: 'POST', body: JSON.stringify(body) })
        .then(r => r.brief),

    createRenderJob: (body: { briefId: string; productId: string; shopDomain?: string; product: { title: string; material: string; cabinetColor: string } }) =>
      req<{ job: RenderJob }>('/render-jobs', { method: 'POST', body: JSON.stringify(body) })
        .then(r => resolveJob(r.job)),

    createBatchRenderJobs: (body: { briefId: string; shopDomain?: string; products: Array<{ productId: string; product: { title: string; material: string; cabinetColor: string } }> }) =>
      req<{ jobs: Array<{ productId: string; job: RenderJob }> }>('/render-jobs/batch', { method: 'POST', body: JSON.stringify(body) })
        .then(r => r.jobs.map(({ productId, job }) => ({ productId, job: resolveJob(job) }))),

    getRenderJob: (jobId: string) =>
      req<{ job: RenderJob }>(`/render-jobs/${jobId}`).then(r => resolveJob(r.job)),

    watchRenderJob: (jobId: string, onUpdate: (job: RenderJob) => void): (() => void) => {
      const url = `${baseUrl}/api/render-jobs/${jobId}/events`
      const controller = new AbortController()
      let closed = false
      let pollTimer: ReturnType<typeof setInterval> | null = null

      const startPollingFallback = () => {
        pollTimer = setInterval(async () => {
          if (closed) { clearInterval(pollTimer!); return }
          try {
            const job = resolveJob((await req<{ job: RenderJob }>(`/render-jobs/${jobId}`)).job)
            onUpdate(job)
            if (isTerminalStatus(job.status)) { clearInterval(pollTimer!); pollTimer = null }
          } catch { /* ignore */ }
        }, 5000)
      }

      ;(async () => {
        try {
          const res = await fetch(url, {
            headers: { 'ngrok-skip-browser-warning': 'true' },
            signal: controller.signal,
          })
          if (!res.ok || !res.body) { if (!closed) startPollingFallback(); return }
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buf = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done || closed) break
            buf += decoder.decode(value, { stream: true })
            const parts = buf.split('\n\n')
            buf = parts.pop() ?? ''
            for (const part of parts) {
              const line = part.trim()
              if (!line.startsWith('data:')) continue
              try { onUpdate(resolveJob(JSON.parse(line.slice(5).trim()) as RenderJob)) } catch { /* ignore */ }
            }
          }
        } catch {
          if (!closed) startPollingFallback()
        }
      })()

      return () => {
        closed = true
        controller.abort()
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
      }
    },

    reportRenderTiming: (jobId: string, stages: {
      briefMs: number; submitMs: number; pollWaitMs: number; totalClientMs: number
    }): void => {
      fetch(`${baseUrl}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          eventType: 'render_client_timing',
          jobId,
          anonymousId: (() => {
            const key = 'vir_anon_id'
            let id = localStorage.getItem(key)
            if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
            return id
          })(),
          properties: {
            brief_ms: stages.briefMs,
            submit_ms: stages.submitMs,
            poll_wait_ms: stages.pollWaitMs,
            total_client_ms: stages.totalClientMs,
          },
        }),
      }).catch(() => { /* fire and forget */ })
    },
  }
}

export type Api = ReturnType<typeof createApi>

export async function fetchShopifyProducts(collectionHandle: string): Promise<WidgetProduct[]> {
  const { mapShopifyProduct } = await import('./types')
  try {
    const res = await fetch(`/collections/${collectionHandle}/products.json?limit=50`)
    if (!res.ok) return []
    const data = await res.json() as { products: import('./types').ShopifyApiProduct[] }
    return (data.products ?? []).map(mapShopifyProduct)
  } catch {
    return []
  }
}

// Returns the Shopify numeric product ID — tries globals first, falls back to JSON API.
export async function fetchShopifyProductId(productHandle: string): Promise<number | null> {
  try {
    // Dawn and most themes expose this
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalId = (window as any)?.ShopifyAnalytics?.meta?.product?.id
    if (typeof globalId === 'number') return globalId

    const res = await fetch(`/products/${productHandle}.json`)
    if (!res.ok) return null
    const data = await res.json() as { product: { id: number } }
    return data.product?.id ?? null
  } catch {
    return null
  }
}

export async function fetchShopifyRecommendations(productId: number, limit = 10): Promise<WidgetProduct[]> {
  const { mapShopifyProduct } = await import('./types')
  try {
    const res = await fetch(`/recommendations/products.json?product_id=${productId}&limit=${limit}`)
    if (!res.ok) return []
    const data = await res.json() as { products: import('./types').ShopifyApiProduct[] }
    return (data.products ?? []).map(mapShopifyProduct)
  } catch {
    return []
  }
}

export interface WidgetConfig {
  collectionEnabled: boolean
  pdpCtaEnabled: boolean
  pdpCarouselEnabled: boolean
  pdpRecommendationsEnabled: boolean
}

interface PublicConfigResponse {
  enabledCollectionHandles: string[]
  collectionSettings?: Record<string, {
    pdpCtaEnabled: boolean
    pdpCarouselEnabled: boolean
    pdpRecommendationsEnabled: boolean
  }>
}

const FAIL_OPEN: WidgetConfig = {
  collectionEnabled: false,
  pdpCtaEnabled: false,
  pdpCarouselEnabled: false,
  pdpRecommendationsEnabled: false,
}

export async function fetchWidgetConfig(
  backofficeUrl: string,
  shopDomain: string,
  collectionHandle: string,
): Promise<WidgetConfig> {
  try {
    const res = await fetch(`${backofficeUrl}/api/public/config?shop=${encodeURIComponent(shopDomain)}`, { headers: NGROK_HEADERS })
    if (!res.ok) return FAIL_OPEN
    const data = await res.json() as PublicConfigResponse
    const collectionEnabled = data.enabledCollectionHandles.includes(collectionHandle)
    const settings = data.collectionSettings?.[collectionHandle]
    return {
      collectionEnabled,
      pdpCtaEnabled: settings?.pdpCtaEnabled ?? false,
      pdpCarouselEnabled: settings?.pdpCarouselEnabled ?? false,
      pdpRecommendationsEnabled: settings?.pdpRecommendationsEnabled ?? false,
    }
  } catch {
    return FAIL_OPEN
  }
}

// ─── Widget analytics ─────────────────────────────────────────────────────────

export type WidgetEventType =
  | 'collection_viewed'
  | 'pdp_viewed'
  | 'setup_opened'
  | 'setup_confirmed'
  | 'setup_cancelled'
  | 'render_job_created'
  | 'render_image_viewed'
  | 'camera_opened'
  | 'camera_capture'
  | 'camera_denied'
  | 'camera_error'

export function trackWidgetEvent(
  backofficeUrl: string,
  eventType: WidgetEventType,
  opts: {
    shopDomain?: string
    surface?: 'collection' | 'pdp'
    productId?: string
    anonymousId?: string
    properties?: Record<string, unknown>
  } = {},
): void {
  const anonymousId = opts.anonymousId ?? getAnonymousId()
  fetch(`${backofficeUrl}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, anonymousId, ...opts }),
  }).catch(() => { /* fire and forget */ })
}

function getAnonymousId(): string {
  const key = 'vir_anon_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export interface PDPConfig {
  collectionHandle: string
  pdpCtaEnabled: boolean
  pdpCarouselEnabled: boolean
  pdpRecommendationsEnabled: boolean
  productCategory?: string | null
}

// Called on PDP pages when the collection handle can't be inferred from the DOM.
// The server looks up which collection the product belongs to via sku_assets.
export async function fetchWidgetPDPConfig(
  backofficeUrl: string,
  shopDomain: string,
  productHandle: string,
): Promise<PDPConfig> {
  const fallback: PDPConfig = { collectionHandle: '', pdpCtaEnabled: false, pdpCarouselEnabled: false, pdpRecommendationsEnabled: false }
  try {
    const res = await fetch(
      `${backofficeUrl}/api/public/pdp-config?shop=${encodeURIComponent(shopDomain)}&productHandle=${encodeURIComponent(productHandle)}`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } },
    )
    if (!res.ok) return fallback
    return await res.json() as PDPConfig
  } catch {
    return fallback
  }
}

// Kept for backwards-compat with Widget.tsx (collection page)
export async function checkBackofficeEnabled(
  backofficeUrl: string,
  shopDomain: string,
  collectionHandle: string,
): Promise<boolean> {
  const config = await fetchWidgetConfig(backofficeUrl, shopDomain, collectionHandle)
  return config.collectionEnabled
}
