import { createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Widget } from './Widget'
import { PDPWidget } from './PDPWidget'
import { CarouselWidget } from './CarouselWidget'
import { RecommendationsWidget } from './RecommendationsWidget'
import { createApi, fetchWidgetConfig, fetchWidgetPDPConfig, fetchAppearanceSettings, trackWidgetEvent } from './api'
import { createPDPStore } from './pdpStore'

function getAnonymousId(): string {
  const key = 'vir_anon_id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}

function setupAddToCartTracking(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const btn = target.closest('[type="submit"], [name="add"], .add-to-cart, .btn-cart') as HTMLElement | null
    if (!btn) return
    if (!btn.closest('form[action*="/cart/add"]')) return
    // Write the VIR anonymous ID as a cart attribute so it flows into the order
    fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes: { vir_anon_id: getAnonymousId() } }),
    }).catch(() => { /* silent — attribution is best-effort */ })
  }, { capture: true, passive: true })
}

// document.currentScript is null when the script is async/deferred or the browser
// doesn't set it (some mobile environments). Fall back to finding the script by
// its unique data attribute so we can still read backofficeUrl and shopDomain.
const currentScript = (document.currentScript as HTMLScriptElement | null)
  ?? document.querySelector<HTMLScriptElement>('script[data-backoffice-url]')

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

  if (!backofficeUrl) {
    console.warn('[VIR] Missing backoffice-url — widget not mounted')
    return
  }

  // On PDP pages, DOM inference is unreliable — navigation links to other collections
  // cause the wrong collection config to be loaded. Always use the server-side lookup
  // (fetchWidgetPDPConfig) unless the merchant explicitly set data-collection-handle.
  const explicitHandle = currentScript?.dataset.collectionHandle
  let collectionHandle = explicitHandle ?? (isPDP ? '' : autoCollection)

  const productTitle = (document.querySelector('h1') as HTMLElement | null)?.innerText?.trim()
    ?? productHandle

  let config: import('./api').WidgetConfig
  const appearance = await fetchAppearanceSettings(backofficeUrl, shopDomain)

  if (isPDP && !explicitHandle) {
    // Server looks up which collection this product belongs to via sku_assets
    const pdpConfig = await fetchWidgetPDPConfig(backofficeUrl, shopDomain, productHandle)
    collectionHandle = pdpConfig.collectionHandle
    config = {
      collectionEnabled: false,
      pdpCtaEnabled: pdpConfig.pdpCtaEnabled,
      pdpCarouselEnabled: pdpConfig.pdpCarouselEnabled,
      pdpRecommendationsEnabled: pdpConfig.pdpRecommendationsEnabled,
    }
    // Make productCategory available for the setup flow action selection
    Object.assign(config, { productCategory: pdpConfig.productCategory ?? null })
  } else {
    if (!collectionHandle) {
      console.warn('[VIR] Missing collection-handle — widget not mounted')
      return
    }
    config = await fetchWidgetConfig(backofficeUrl, shopDomain, collectionHandle)
  }

  const collectionName = currentScript?.dataset.collectionName
    ?? (isPDP
      // Find the link whose href matches the resolved collectionHandle for display name
      ? Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/collections/"]'))
          .find(l => l.href.match(/\/collections\/([^/?#]+)/)?.[1] === collectionHandle)
          ?.innerText?.trim()
      : (document.querySelector('h1') as HTMLElement | null)?.innerText?.trim())
    ?? collectionHandle

  if (isPDP) {
    if (!config.pdpCtaEnabled && !config.pdpCarouselEnabled && !config.pdpRecommendationsEnabled) return

    trackWidgetEvent(backofficeUrl, 'pdp_viewed', { shopDomain, surface: 'pdp' })
    setupAddToCartTracking()

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
      mount(container, createElement(PDPWidget, { api, store, collectionHandle, collectionName: collectionName ?? collectionHandle, productHandle, productTitle, productCategory: (config as { productCategory?: string | null }).productCategory, backofficeUrl, shopDomain, appearance }))
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
        api, store, productHandle, collectionHandle, shopDomain, backofficeUrl, collectionName: collectionName ?? collectionHandle, appearance,
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
