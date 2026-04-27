import { createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Widget } from './Widget'
import { PDPWidget } from './PDPWidget'
import { CarouselWidget } from './CarouselWidget'
import { RecommendationsWidget } from './RecommendationsWidget'
import { createApi, fetchWidgetConfig, fetchAppearanceSettings, trackWidgetEvent } from './api'
import { createPDPStore } from './pdpStore'

const currentScript = document.currentScript as HTMLScriptElement | null

function parsePath() {
  const path = window.location.pathname
  return {
    collectionHandle: path.match(/\/collections\/([^/?#]+)/)?.[1] ?? '',
    productHandle: path.match(/\/products\/([^/?#]+)/)?.[1] ?? '',
    isPDP: /\/products\//.test(path),
  }
}

// Try to find the collection handle from breadcrumb links on PDP pages
const GENERIC_HANDLES = new Set(['all', 'frontpage', 'new', 'sale', 'best-sellers', 'featured'])

function inferCollectionHandle(): string {
  const links = Array.from(document.querySelectorAll('a[href*="/collections/"]')) as HTMLAnchorElement[]
  // Prefer breadcrumb links, then any non-generic collection link
  const sorted = [
    ...links.filter(l => l.closest('nav, [class*="breadcrumb"], [aria-label*="breadcrumb" i]')),
    ...links,
  ]
  for (const link of sorted) {
    const handle = link.href.match(/\/collections\/([^/?#]+)/)?.[1]
    if (handle && !GENERIC_HANDLES.has(handle)) return handle
  }
  return ''
}

// Find or create a mount point inside the product image carousel.
// Supports explicit merchant placement via [data-vir-carousel-slot],
// then tries common Shopify theme selectors.
function findCarouselSlot(): HTMLElement | null {
  // Explicit placement wins
  const explicit = document.querySelector('[data-vir-carousel-slot]') as HTMLElement | null
  if (explicit) return explicit

  // Dawn theme: product__media-list
  const mediaList = document.querySelector('.product__media-list, .product__media-wrapper ul')
  if (mediaList) {
    const li = document.createElement('li')
    li.className = 'product__media-item'
    mediaList.appendChild(li)
    return li
  }

  // Debut / older themes
  const photoWrapper = document.querySelector('.product-single__photos, .product__photos')
  if (photoWrapper) {
    const div = document.createElement('div')
    div.className = 'product-single__photo-wrapper'
    photoWrapper.appendChild(div)
    return div
  }

  return null
}

function mount(container: HTMLElement, element: React.ReactElement) {
  createRoot(container).render(createElement(StrictMode, null, element))
}

async function init() {
  const backofficeUrl = currentScript?.dataset.backofficeUrl ?? ''
  const shopDomain = currentScript?.dataset.shopDomain ?? window.location.hostname

  const { collectionHandle: autoCollection, productHandle, isPDP } = parsePath()

  const collectionHandle = currentScript?.dataset.collectionHandle
    ?? (isPDP ? inferCollectionHandle() : autoCollection)

  const collectionName = currentScript?.dataset.collectionName
    ?? (isPDP
      ? Array.from(document.querySelectorAll('a[href*="/collections/"]'))
          .find((l): l is HTMLAnchorElement => {
            const h = (l as HTMLAnchorElement).href.match(/\/collections\/([^/?#]+)/)?.[1]
            return !!h && !GENERIC_HANDLES.has(h)
          })?.innerText?.trim()
      : (document.querySelector('h1') as HTMLElement | null)?.innerText?.trim())
    ?? collectionHandle

  const productTitle = (document.querySelector('h1') as HTMLElement | null)?.innerText?.trim()
    ?? productHandle

  if (!backofficeUrl || !collectionHandle) {
    console.warn('[VIR] Missing backoffice-url or collection-handle — widget not mounted')
    return
  }

  const [config, appearance] = await Promise.all([
    fetchWidgetConfig(backofficeUrl, shopDomain, collectionHandle),
    fetchAppearanceSettings(backofficeUrl, shopDomain),
  ])

  if (isPDP) {
    if (!config.pdpCtaEnabled && !config.pdpCarouselEnabled && !config.pdpRecommendationsEnabled) return

    trackWidgetEvent(backofficeUrl, 'pdp_viewed', { shopDomain, surface: 'pdp' })

    const api = createApi(backofficeUrl)
    const store = createPDPStore(api, productHandle, productTitle, shopDomain)

    const virJobId = new URLSearchParams(window.location.search).get('vir_job_id')
    if (virJobId) {
      try {
        const renderJob = await api.getRenderJob(virJobId)
        const brief = await api.getSceneBrief(renderJob.briefId)
        store.hydrate(brief, renderJob)
      } catch { /* silent — show normal setup UI */ }
    }

    if (config.pdpCtaEnabled) {
      const container = document.createElement('div')
      const anchor = document.querySelector('form[action*="/cart/add"], .product-form, [data-vir-cta-target]')
      if (anchor?.parentNode) {
        anchor.parentNode.insertBefore(container, anchor)
      } else {
        const h1 = document.querySelector('h1')
        h1?.insertAdjacentElement('afterend', container) ?? document.body.prepend(container)
      }
      mount(container, createElement(PDPWidget, { api, store, collectionHandle, collectionName: collectionName ?? collectionHandle, productTitle, backofficeUrl, shopDomain, appearance }))
    }

    if (config.pdpCarouselEnabled) {
      const slot = findCarouselSlot()
      if (slot) {
        mount(slot, createElement(CarouselWidget, { api, store, collectionName: collectionName ?? collectionHandle, productTitle, backofficeUrl, shopDomain, appearance }))
      } else {
        console.warn('[VIR] Carousel slot not found — add <div data-vir-carousel-slot> to your theme carousel template')
      }
    }

    if (config.pdpRecommendationsEnabled) {
      const container = document.createElement('div')
      // Insert AFTER Shopify's related-products section so VIR appears below it,
      // not before it (which would put it above the fold and invisible on scroll-down).
      const related = document.querySelector<HTMLElement>(
        '[data-vir-rec-target], .product-recommendations, .related-products'
      )
      const mainEl = document.querySelector<HTMLElement>('main, [role="main"], #MainContent')
      if (related) {
        related.insertAdjacentElement('afterend', container)
      } else if (mainEl) {
        mainEl.appendChild(container)
      } else {
        document.body.appendChild(container)
      }
      mount(container, createElement(RecommendationsWidget, {
        api, store, productHandle, collectionHandle, shopDomain, collectionName: collectionName ?? collectionHandle, appearance,
      }))
    }
  } else {
    if (!config.collectionEnabled) return

    trackWidgetEvent(backofficeUrl, 'collection_viewed', { shopDomain, surface: 'collection' })

    const container = document.createElement('div')
    const productGrid = document.querySelector('[data-vir-target], .collection-grid, .product-grid, main')
    if (productGrid?.parentNode) {
      productGrid.parentNode.insertBefore(container, productGrid)
    } else {
      document.body.prepend(container)
    }
    mount(container, createElement(Widget, { backofficeUrl, collectionHandle, collectionName: collectionName ?? collectionHandle, appearance }))
  }
}

init().catch(err => console.error('[VIR] init failed:', err))
