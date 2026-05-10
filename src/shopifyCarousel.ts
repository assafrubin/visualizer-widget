// Swaps the main Shopify product image src with the rendered room view.
// This is the same mechanism Shopify uses for variant image switching —
// much more reliable than injecting a new carousel slide, because it works
// on single-image products and requires no knowledge of the theme's carousel JS.

const BADGE_CLASS = 'vir-render-badge'

// Ordered by specificity — prefer the active/featured image
const MAIN_IMG_SELECTORS = [
  '.product__media-item.is-active img',      // Dawn (active slide)
  '.product__media-item img',                // Dawn (first slide)
  '.product-single__photo--main img',        // Debut
  '[data-product-featured-media] img',       // generic Shopify
  '.product-featured-media img',             // generic
  '.product__photo img',                     // Brooklyn
  '.product-single__photo img',              // Supply / older themes
  '.product__media img',                     // catch-all
]

// Module-level state — one injection at a time
let swappedImg: HTMLImageElement | null = null
let savedSrc = ''
let savedSrcset = ''

function findMainImg(): HTMLImageElement | null {
  for (const sel of MAIN_IMG_SELECTORS) {
    const img = document.querySelector<HTMLImageElement>(sel)
    if (img) {
      console.info('[VIR] product image found via:', sel)
      return img
    }
  }
  console.warn('[VIR] Could not find main product image to swap')
  return null
}

export function injectIntoCarousel(src: string): HTMLElement | null {
  // Clean up any previous injection first
  removeInjectedSlide()

  const img = findMainImg()
  if (!img) return null

  // Save originals so we can restore on clear
  savedSrc = img.src
  savedSrcset = img.srcset
  swappedImg = img

  // Swap the src — clear srcset so the browser doesn't revert to the responsive set
  img.src = src
  img.srcset = ''

  // Add a small badge on the image container
  const container = (
    img.closest('.product__media, .product-single__photo, figure') ??
    img.parentElement
  ) as HTMLElement | null

  if (container) {
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative'
    }
    const badge = document.createElement('span')
    badge.className = BADGE_CLASS
    badge.textContent = '✦ Your room view'
    badge.style.cssText = [
      'position: absolute',
      'bottom: 8px',
      'left: 8px',
      'background: rgba(255,255,255,0.92)',
      'color: #2563EB',
      'font-size: 11px',
      'font-weight: 700',
      'padding: 3px 9px',
      'border-radius: 20px',
      'letter-spacing: 0.01em',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'pointer-events: none',
      'z-index: 100',
    ].join('; ')
    container.appendChild(badge)
    return badge
  }

  // No container for the badge — still return non-null so caller knows it worked
  return img
}

export function scrollToInjectedSlide(): void {
  // The render is already the main image — just scroll to bring it into view
  swappedImg?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function removeInjectedSlide(): void {
  // Restore the original image
  if (swappedImg && savedSrc) {
    swappedImg.src = savedSrc
    swappedImg.srcset = savedSrcset
  }
  swappedImg = null
  savedSrc = ''
  savedSrcset = ''

  // Remove badge
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach(el => el.remove())
}
