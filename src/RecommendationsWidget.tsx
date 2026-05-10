import { useState, useEffect, useRef, useCallback } from 'react'
import type { WidgetProduct } from './types'
import type { PDPStore } from './pdpStore'
import type { Api, RenderJob, AppearanceSettings } from './api'
import { isTerminalStatus, fetchShopifyProducts, DEFAULT_APPEARANCE, trackWidgetEvent } from './api'
import { renderCache } from './renderCache'
import { WIDGET_CSS } from './styles'
import { useBackofficeImage } from './useBackofficeImage'
import { LottieLoader } from './LottieLoader'

export interface RecommendationsWidgetProps {
  api: Api
  store: PDPStore
  productHandle: string
  collectionHandle: string
  shopDomain: string
  backofficeUrl: string
  collectionName?: string
  appearance?: AppearanceSettings
}

const MAX_RECS = 10
const EAGER_RENDER_COUNT = 4 // PDP product renders separately; fill the first visible carousel page

function RecCard({ product, job, brief, roomBadge, backofficeUrl, shopDomain }: {
  product: WidgetProduct
  job: RenderJob | undefined
  brief: import('./types').CollectionSceneBrief | null
  roomBadge: string
  backofficeUrl: string
  shopDomain: string
}) {
  const isRendering = !!brief && (!job || job.status === 'submitted' || job.status === 'processing')
  const renderImgSrc = useBackofficeImage(job?.status === 'succeeded' ? job.imageUrl : null)
  const viewTrackedForJob = useRef<string | null>(null)

  useEffect(() => {
    if (!renderImgSrc || !job?.jobId || viewTrackedForJob.current === job.jobId) return
    viewTrackedForJob.current = job.jobId
    trackWidgetEvent(backofficeUrl, 'render_image_viewed', {
      shopDomain,
      surface: 'pdp',
      productId: product.id,
      properties: { job_id: job.jobId },
    })
  }, [renderImgSrc, job?.jobId, backofficeUrl, shopDomain, product.id])

  const href = job?.jobId
    ? `/products/${product.handle}?vir_job_id=${job.jobId}`
    : `/products/${product.handle}`

  return (
    <a className="vir-rec__card" data-product-id={product.id} href={href}>
      <div className="vir-rec__card-img">
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.title}
            className={`vir-rec__product-img ${renderImgSrc ? 'vir-rec__product-img--hidden' : ''}`}
          />
        )}
        {!product.imageUrl && !renderImgSrc && (
          <div className="vir-rec__img-placeholder" />
        )}
        {renderImgSrc && (
          <img src={renderImgSrc} alt={`${product.title} in room`} className="vir-rec__render-img" />
        )}
        {isRendering && (
          <div className="vir-rec__render-overlay">
            <LottieLoader size={72} />
          </div>
        )}
        {renderImgSrc && (
          <span className="vir-rec__room-badge">✦ {roomBadge}</span>
        )}
      </div>
      <div className="vir-rec__card-info">
        <span className="vir-rec__card-title">{product.title}</span>
        <span className="vir-rec__card-price">€{product.price}</span>
      </div>
    </a>
  )
}

export function RecommendationsWidget({ api, store, productHandle, collectionHandle, shopDomain, backofficeUrl, appearance = DEFAULT_APPEARANCE }: RecommendationsWidgetProps) {
  const { brief } = store.usePDPStore()

  const [products, setProducts] = useState<WidgetProduct[]>([])
  const [renderJobs, setRenderJobs] = useState<Map<string, RenderJob>>(new Map())
  const [loadingProducts, setLoadingProducts] = useState(true)

  const stripRef = useRef<HTMLDivElement>(null)
  // Track which product IDs have had a render job kicked off for the current brief
  const renderedForBrief = useRef<{ briefId: string; started: Set<string> } | null>(null)
  // SSE cleanup functions keyed by productId
  const sseCleanups = useRef<Map<string, () => void>>(new Map())

  // ── Load collection products, excluding current product ───────────────────
  useEffect(() => {
    let cancelled = false
    setLoadingProducts(true)

    fetchShopifyProducts(collectionHandle)
      .then(all => {
        if (cancelled) return
        const others = all.filter(p => p.handle !== productHandle).slice(0, MAX_RECS)
        setProducts(others)
      })
      .catch(() => { /* ignore — widget just won't show */ })
      .finally(() => { if (!cancelled) setLoadingProducts(false) })

    return () => { cancelled = true }
  }, [collectionHandle, productHandle])

  // ── Close SSE connections and reset state when brief changes / on unmount ──
  useEffect(() => {
    sseCleanups.current.forEach(cleanup => cleanup())
    sseCleanups.current.clear()
    setRenderJobs(new Map())
    renderedForBrief.current = null
    return () => {
      sseCleanups.current.forEach(cleanup => cleanup())
      sseCleanups.current.clear()
    }
  }, [brief?.id])

  // ── Kick off render for a product (called by IntersectionObserver) ────────
  const startRender = useCallback(async (product: WidgetProduct) => {
    if (!brief) return
    const tracker = renderedForBrief.current
    if (tracker?.briefId === brief.id && tracker.started.has(product.id)) return

    if (!renderedForBrief.current || renderedForBrief.current.briefId !== brief.id) {
      renderedForBrief.current = { briefId: brief.id, started: new Set() }
    }
    renderedForBrief.current.started.add(product.id)

    const cached = renderCache.get(product.id, brief.id)
    if (cached) {
      setRenderJobs(prev => new Map(prev).set(product.id, cached))
      return
    }

    setRenderJobs(prev => new Map(prev).set(product.id, {
      jobId: '', briefId: brief.id, status: 'submitted', imageUrl: null, error: null,
    }))

    try {
      const job = await api.createRenderJob({
        briefId: brief.id,
        productId: product.id,
        shopDomain,
        product: { title: product.title, material: product.material, cabinetColor: '' },
      })
      setRenderJobs(prev => new Map(prev).set(product.id, job))
      if (job.status === 'succeeded') {
        renderCache.set(product.id, brief.id, job)
      } else if (!isTerminalStatus(job.status)) {
        const cleanup = api.watchRenderJob(job.jobId, (updated) => {
          setRenderJobs(prev => new Map(prev).set(product.id, updated))
          if (updated.status === 'succeeded' && brief) renderCache.set(product.id, brief.id, updated)
          if (isTerminalStatus(updated.status)) sseCleanups.current.delete(product.id)
        })
        sseCleanups.current.set(product.id, cleanup)
      }
    } catch (err) {
      console.error('[VIR/Rec] createRenderJob failed for', product.title, err)
      renderedForBrief.current?.started.delete(product.id)
      setRenderJobs(prev => {
        const next = new Map(prev)
        next.delete(product.id)
        return next
      })
    }
  }, [brief, api, shopDomain])

  // ── Eager parallel renders for the first visible page ────────────────────
  // All jobs share the room photo via Gemini Files API URI so N renders cost
  // the same transfer as 1 and complete in parallel (~17s total, not 17s × N).
  // Products beyond EAGER_RENDER_COUNT fall through to the IntersectionObserver.
  useEffect(() => {
    if (!brief || !products.length) return
    products.slice(0, EAGER_RENDER_COUNT).forEach(product => startRender(product))
  }, [brief?.id, products, startRender])

  // ── IntersectionObserver: lazy render for products beyond the eager page ──
  useEffect(() => {
    if (!brief || !stripRef.current || !products.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          const productId = (entry.target as HTMLElement).dataset.productId
          const product = products.find(p => p.id === productId)
          if (product) startRender(product)
        })
      },
      { root: stripRef.current, rootMargin: '0px 120px 0px 0px', threshold: 0.1 },
    )

    stripRef.current.querySelectorAll<HTMLElement>('[data-product-id]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [brief?.id, products, startRender])

  // ── Scroll controls ───────────────────────────────────────────────────────
  function scroll(dir: 'prev' | 'next') {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'next' ? el.offsetWidth : -el.offsetWidth, behavior: 'smooth' })
  }

  // Hide products whose render job failed (e.g. no cutout available) — show only
  // products that are pending, in-flight, or successfully rendered.
  const visibleProducts = products.filter(p => renderJobs.get(p.id)?.status !== 'failed')

  if (loadingProducts || visibleProducts.length === 0 || !brief) return null

  const cssVars = { '--vir-accent': appearance.accentColor, '--vir-accent-text': appearance.accentTextColor } as React.CSSProperties

  return (
    <div className="vir-widget" style={cssVars}>
      <style>{WIDGET_CSS}</style>
      <div className="vir-rec">
        <div className="vir-rec__header">
          <div className="vir-rec__title-group">
            <h3 className="vir-rec__title">{appearance.recsTitle}</h3>
            {brief && (
              <span className="vir-rec__room-tag">
                ✦ {brief.room.name} · {brief.action.label}
              </span>
            )}
          </div>
          <div className="vir-rec__nav">
            <button className="vir-rec__arrow" onClick={() => scroll('prev')} aria-label="Previous">‹</button>
            <button className="vir-rec__arrow" onClick={() => scroll('next')} aria-label="Next">›</button>
          </div>
        </div>

        <div className="vir-rec__strip" ref={stripRef}>
          {visibleProducts.map(product => (
            <RecCard
              key={product.id}
              product={product}
              job={renderJobs.get(product.id)}
              brief={brief}
              roomBadge={appearance.recsRoomBadge}
              backofficeUrl={backofficeUrl}
              shopDomain={shopDomain}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
