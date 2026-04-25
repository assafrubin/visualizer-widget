import type { RoomProfile, DetectedZone, QuickActionId, EnhancedSceneBrief, WidgetProduct } from './types'

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
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
    return res.json() as Promise<T>
  }

  return {
    getRooms: () =>
      req<{ rooms: RoomProfile[] }>('/rooms').then(r => r.rooms),

    uploadRoom: (body: { imageDataUrl: string; filename: string }) =>
      req<{ room: RoomProfile }>('/rooms/upload', { method: 'POST', body: JSON.stringify(body) })
        .then(r => r.room),

    analyzeRoom: (roomId: string) =>
      req<{ zones: DetectedZone[] }>(`/rooms/${roomId}/analysis`, { method: 'POST' })
        .then(r => r.zones),

    createSceneBrief: (body: { roomId: string; actionId: QuickActionId; refinementText: string; collectionName: string }) =>
      req<{ brief: EnhancedSceneBrief }>('/scene-briefs', { method: 'POST', body: JSON.stringify(body) })
        .then(r => r.brief),

    createRenderJob: (body: { briefId: string; productId: string; product: { title: string; material: string; cabinetColor: string } }) =>
      req<{ job: RenderJob }>('/render-jobs', { method: 'POST', body: JSON.stringify(body) })
        .then(r => r.job),

    getRenderJob: (jobId: string) =>
      req<{ job: RenderJob }>(`/render-jobs/${jobId}`).then(r => r.job),
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
  collectionEnabled: true,
  pdpCtaEnabled: true,
  pdpCarouselEnabled: false,
  pdpRecommendationsEnabled: false,
}

export async function fetchWidgetConfig(
  backofficeUrl: string,
  shopDomain: string,
  collectionHandle: string,
): Promise<WidgetConfig> {
  try {
    const res = await fetch(`${backofficeUrl}/api/public/config?shop=${encodeURIComponent(shopDomain)}`)
    if (!res.ok) return FAIL_OPEN
    const data = await res.json() as PublicConfigResponse
    const collectionEnabled = data.enabledCollectionHandles.includes(collectionHandle)
    const settings = data.collectionSettings?.[collectionHandle]
    return {
      collectionEnabled,
      pdpCtaEnabled: settings?.pdpCtaEnabled ?? true,
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

// Kept for backwards-compat with Widget.tsx (collection page)
export async function checkBackofficeEnabled(
  backofficeUrl: string,
  shopDomain: string,
  collectionHandle: string,
): Promise<boolean> {
  const config = await fetchWidgetConfig(backofficeUrl, shopDomain, collectionHandle)
  return config.collectionEnabled
}
