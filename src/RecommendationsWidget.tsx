import { useState, useEffect, useRef, useCallback } from 'react'
import type { WidgetProduct } from './types'
import type { PDPStore } from './pdpStore'
import type { Api, RenderJob, AppearanceSettings } from './api'
import { isTerminalStatus, fetchShopifyProducts, DEFAULT_APPEARANCE } from './api'
import { renderCache } from './renderCache'
import { WIDGET_CSS } from './styles'

export interface RecommendationsWidgetProps {
  api: Api
  store: PDPStore
  productHandle: string
  collectionHandle: string
  shopDomain: string
  collectionName?: string
  appearance?: AppearanceSettings
}

const MAX_RECS = 10

export function RecommendationsWidget({ api, store, productHandle, collectionHandle, shopDomain, appearance = DEFAULT_APPEARANCE }: RecommendationsWidgetProps) {
  const { brief } = store.usePDPStore()

  const [products, setProducts] = useState<WidgetProduct[]>([])
  const [renderJobs, setRenderJobs] = useState<Map<string, RenderJob>>(new Map())
  const [loadingProducts, setLoadingProducts] = useState(true)

  const stripRef = useRef<HTMLDivElement>(null)
  const selfRef = useRef<HTMLDivElement>(null)
  // Track which product IDs have had a render job kicked off for the current brief
  const renderedForBrief = useRef<{ briefId: string; started: Set<string> } | null>(null)

  // Scroll into view the first time the recommendations become visible (brief just set)
  useEffect(() => {
    if (!brief || !selfRef.current) return
    const el = selfRef.current
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 200)
  }, [brief?.id])

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

  // ── Poll non-terminal render jobs ─────────────────────────────────────────
  useEffect(() => {
    const active = [...renderJobs.entries()].filter(([, j]) => !isTerminalStatus(j.status))
    if (!active.length) return
    const timer = setInterval(() => {
      active.forEach(async ([productId, job]) => {
        try {
          const updated = await api.getRenderJob(job.jobId)
          setRenderJobs(prev => new Map(prev).set(productId, updated))
          if (updated.status === 'succeeded' && brief) {
            renderCache.set(productId, brief.id, updated)
          }
        } catch { /* ignore */ }
      })
    }, 3000)
    return () => clearInterval(timer)
  }, [renderJobs, api, brief])

  // Clear render jobs when brief is cleared
  useEffect(() => {
    if (!brief) {
      setRenderJobs(new Map())
      renderedForBrief.current = null
    }
  }, [brief])

  // ── Kick off render for a product (called by IntersectionObserver) ────────
  const startRender = useCallback(async (product: WidgetProduct) => {
    if (!brief) return
    const tracker = renderedForBrief.current
    if (tracker?.started.has(product.id)) return

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
      if (job.status === 'succeeded') renderCache.set(product.id, brief.id, job)
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

  // ── IntersectionObserver: start render when card scrolls into view ────────
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

  if (loadingProducts || products.length === 0 || !brief) return null

  const cssVars = { '--vir-accent': appearance.accentColor, '--vir-accent-text': appearance.accentTextColor } as React.CSSProperties

  return (
    <div ref={selfRef} className="vir-widget" style={cssVars}>
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
          {products.map(product => {
            const job = renderJobs.get(product.id)
            const isRendering = !!brief && (!job || job.status === 'submitted' || job.status === 'processing')
            const renderUrl = job?.status === 'succeeded' ? job.imageUrl : null
            const href = job?.jobId
              ? `/products/${product.handle}?vir_job_id=${job.jobId}`
              : `/products/${product.handle}`

            return (
              <a key={product.id} className="vir-rec__card" data-product-id={product.id} href={href}>
                <div className="vir-rec__card-img">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className={`vir-rec__product-img ${renderUrl ? 'vir-rec__product-img--hidden' : ''}`}
                    />
                  )}
                  {!product.imageUrl && !renderUrl && (
                    <div className="vir-rec__img-placeholder" />
                  )}

                  {renderUrl && (
                    <img src={renderUrl} alt={`${product.title} in room`} className="vir-rec__render-img" />
                  )}

                  {isRendering && (
                    <div className="vir-rec__render-overlay">
                      <span className="vir-spinner vir-spinner--dark" />
                    </div>
                  )}

                  {renderUrl && (
                    <span className="vir-rec__room-badge">✦ {appearance.recsRoomBadge}</span>
                  )}
                </div>

                <div className="vir-rec__card-info">
                  <span className="vir-rec__card-title">{product.title}</span>
                  <span className="vir-rec__card-price">€{product.price}</span>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
