import { createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Widget } from './Widget'
import { PDPWidget } from './PDPWidget'
import { CarouselWidget } from './CarouselWidget'
import { RecommendationsWidget } from './RecommendationsWidget'
import { createApi, fetchWidgetConfig, trackWidgetEvent } from './api'
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
function inferCollectionHandle(): string {
  const link = document.querySelector('a[href*="/collections/"]') as HTMLAnchorElement | null
  return link?.href.match(/\/collections\/([^/?#]+)/)?.[1] ?? ''
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
      ? (document.querySelector('a[href*="/collections/"]') as HTMLAnchorElement | null)?.innerText?.trim()
      : (document.querySelector('h1') as HTMLElement | null)?.innerText?.trim())
    ?? collectionHandle

  const productTitle = (document.querySelector('h1') as HTMLElement | null)?.innerText?.trim()
    ?? productHandle

  if (!backofficeUrl || !collectionHandle) {
    console.warn('[VIR] Missing backoffice-url or collection-handle — widget not mounted')
    return
  }

  const config = await fetchWidgetConfig(backofficeUrl, shopDomain, collectionHandle)

  if (isPDP) {
    if (!config.pdpCtaEnabled && !config.pdpCarouselEnabled && !config.pdpRecommendationsEnabled) return

    trackWidgetEvent(backofficeUrl, 'pdp_viewed', { shopDomain, surface: 'pdp' })

    const api = createApi(backofficeUrl)
    const store = createPDPStore(api, productHandle, productTitle)

    if (config.pdpCtaEnabled) {
      const container = document.createElement('div')
      const anchor = document.querySelector('form[action*="/cart/add"], .product-form, [data-vir-cta-target]')
      if (anchor?.parentNode) {
        anchor.parentNode.insertBefore(container, anchor)
      } else {
        const h1 = document.querySelector('h1')
        h1?.insertAdjacentElement('afterend', container) ?? document.body.prepend(container)
      }
      mount(container, createElement(PDPWidget, { api, store, collectionHandle, collectionName: collectionName ?? collectionHandle, productTitle, backofficeUrl, shopDomain }))
    }

    if (config.pdpCarouselEnabled) {
      const slot = findCarouselSlot()
      if (slot) {
        mount(slot, createElement(CarouselWidget, { api, store, collectionName: collectionName ?? collectionHandle, productTitle, backofficeUrl, shopDomain }))
      } else {
        console.warn('[VIR] Carousel slot not found — add <div data-vir-carousel-slot> to your theme carousel template')
      }
    }

    if (config.pdpRecommendationsEnabled) {
      const container = document.createElement('div')
      // Insert before "related products" section or before the footer
      const related = document.querySelector(
        '.product-recommendations, [data-vir-rec-target], .related-products, footer'
      )
      if (related?.parentNode) {
        related.parentNode.insertBefore(container, related)
      } else {
        document.body.appendChild(container)
      }
      mount(container, createElement(RecommendationsWidget, {
        api, store, productHandle, collectionName: collectionName ?? collectionHandle,
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
    mount(container, createElement(Widget, { backofficeUrl, collectionHandle, collectionName: collectionName ?? collectionHandle }))
  }
}

init().catch(err => console.error('[VIR] init failed:', err))
