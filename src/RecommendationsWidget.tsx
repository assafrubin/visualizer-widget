import { useState, useEffect, useRef, useCallback } from 'react'
import type { WidgetProduct } from './types'
import type { PDPStore } from './pdpStore'
import type { Api, RenderJob } from './api'
import { isTerminalStatus, fetchShopifyProductId, fetchShopifyRecommendations } from './api'
import { WIDGET_CSS } from './styles'

export interface RecommendationsWidgetProps {
  api: Api
  store: PDPStore
  productHandle: string
  collectionName?: string
}

const BATCH_SIZE = 10 // fetch once; reveal lazily

export function RecommendationsWidget({ api, store, productHandle }: RecommendationsWidgetProps) {
  const { brief } = store.usePDPStore()

  const [products, setProducts] = useState<WidgetProduct[]>([])
  const [renderJobs, setRenderJobs] = useState<Map<string, RenderJob>>(new Map())
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [error, setError] = useState(false)

  const stripRef = useRef<HTMLDivElement>(null)
  // Track which product IDs have had a render job kicked off for the current brief
  const renderedForBrief = useRef<{ briefId: string; started: Set<string> } | null>(null)

  // ── Load recommendations once ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoadingProducts(true)
    setError(false)

    fetchShopifyProductId(productHandle)
      .then(id => {
        if (cancelled || !id) { if (!cancelled) setError(true); return }
        return fetchShopifyRecommendations(id, BATCH_SIZE)
      })
      .then(recs => {
        if (cancelled || !recs) return
        if (recs.length === 0) setError(true)
        else setProducts(recs)
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoadingProducts(false) })

    return () => { cancelled = true }
  }, [productHandle])

  // ── Poll non-terminal render jobs ─────────────────────────────────────────
  useEffect(() => {
    const active = [...renderJobs.entries()].filter(([, j]) => !isTerminalStatus(j.status))
    if (!active.length) return
    const timer = setInterval(() => {
      active.forEach(async ([productId, job]) => {
        try {
          const updated = await api.getRenderJob(job.jobId)
          setRenderJobs(prev => new Map(prev).set(productId, updated))
        } catch { /* ignore */ }
      })
    }, 3000)
    return () => clearInterval(timer)
  }, [renderJobs, api])

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

    // Optimistic placeholder so UI shows spinner immediately
    setRenderJobs(prev => new Map(prev).set(product.id, {
      jobId: '', briefId: brief.id, status: 'submitted', imageUrl: null, error: null,
    }))

    try {
      const job = await api.createRenderJob({
        briefId: brief.id,
        productId: product.id,
        product: { title: product.title, material: product.material, cabinetColor: '' },
      })
      setRenderJobs(prev => new Map(prev).set(product.id, job))
    } catch (err) {
      console.error('[VIR/Rec] createRenderJob failed for', product.title, err)
      renderedForBrief.current?.started.delete(product.id)
      setRenderJobs(prev => {
        const next = new Map(prev)
        next.delete(product.id)
        return next
      })
    }
  }, [brief, api])

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
    const cardWidth = (el.querySelector('[data-product-id]') as HTMLElement | null)?.offsetWidth ?? 200
    el.scrollBy({ left: dir === 'next' ? cardWidth * 2 : -cardWidth * 2, behavior: 'smooth' })
  }

  if (loadingProducts || error || products.length === 0) return null

  return (
    <div className="vir-widget">
      <style>{WIDGET_CSS}</style>
      <div className="vir-rec">
        <div className="vir-rec__header">
          <div className="vir-rec__title-group">
            <h3 className="vir-rec__title">You may also like</h3>
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

            return (
              <div key={product.id} className="vir-rec__card" data-product-id={product.id}>
                <div className="vir-rec__card-img">
                  {/* Product image — always underneath */}
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

                  {/* Room render — fades in on top */}
                  {renderUrl && (
                    <img src={renderUrl} alt={`${product.title} in room`} className="vir-rec__render-img" />
                  )}

                  {/* Spinner overlay while rendering */}
                  {isRendering && (
                    <div className="vir-rec__render-overlay">
                      <span className="vir-spinner vir-spinner--dark" />
                    </div>
                  )}

                  {renderUrl && (
                    <span className="vir-rec__room-badge">✦ In your room</span>
                  )}
                </div>

                <div className="vir-rec__card-info">
                  <span className="vir-rec__card-title">{product.title}</span>
                  <span className="vir-rec__card-price">€{product.price}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
