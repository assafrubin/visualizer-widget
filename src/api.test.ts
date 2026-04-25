import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { trackWidgetEvent } from './api'

// ─── trackWidgetEvent ─────────────────────────────────────────────────────────

describe('trackWidgetEvent', () => {
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)
    // Provide localStorage and crypto for getAnonymousId
    vi.stubGlobal('localStorage', {
      _store: {} as Record<string, string>,
      getItem(k: string) { return this._store[k] ?? null },
      setItem(k: string, v: string) { this._store[k] = v },
    })
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs to /api/events on the backoffice URL', () => {
    trackWidgetEvent('https://backoffice.example.com', 'pdp_viewed', { shopDomain: 'shop.myshopify.com' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://backoffice.example.com/api/events',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('includes eventType in the request body', () => {
    trackWidgetEvent('http://localhost:3002', 'setup_opened', { shopDomain: 'shop.myshopify.com' })
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string)
    expect(body.eventType).toBe('setup_opened')
  })

  it('includes shopDomain in the request body', () => {
    trackWidgetEvent('http://localhost:3002', 'render_job_created', { shopDomain: 'furniture.myshopify.com', surface: 'pdp' })
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string)
    expect(body.shopDomain).toBe('furniture.myshopify.com')
  })

  it('includes surface when provided', () => {
    trackWidgetEvent('http://localhost:3002', 'collection_viewed', { surface: 'collection', shopDomain: 'shop.myshopify.com' })
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string)
    expect(body.surface).toBe('collection')
  })

  it('generates and reuses an anonymousId from localStorage', () => {
    trackWidgetEvent('http://localhost:3002', 'pdp_viewed', {})
    trackWidgetEvent('http://localhost:3002', 'setup_opened', {})
    const id1 = JSON.parse(fetchSpy.mock.calls[0][1].body as string).anonymousId
    const id2 = JSON.parse(fetchSpy.mock.calls[1][1].body as string).anonymousId
    expect(id1).toBe(id2)
    expect(typeof id1).toBe('string')
    expect(id1.length).toBeGreaterThan(0)
  })

  it('accepts all camera event types without throwing', () => {
    const events = ['camera_opened', 'camera_capture', 'camera_denied', 'camera_error'] as const
    for (const e of events) {
      expect(() => trackWidgetEvent('http://localhost:3002', e, {})).not.toThrow()
    }
    expect(fetchSpy).toHaveBeenCalledTimes(4)
  })

  it('is fire-and-forget — does not throw if fetch fails', async () => {
    fetchSpy.mockRejectedValue(new Error('network error'))
    expect(() => trackWidgetEvent('http://localhost:3002', 'pdp_viewed', {})).not.toThrow()
  })
})
