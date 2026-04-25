export interface RoomProfile {
  id: string
  name: string
  bgColor: string
  accentColor: string
  floorColor: string
  isUploaded?: boolean
  imageDataUrl?: string
}

export type QuickActionId =
  | 'replace-existing'
  | 'near-tv'
  | 'right-wall'
  | 'back-wall'
  | 'front-existing'

export interface QuickAction {
  id: QuickActionId
  label: string
  zone: string
  icon: string
}

export interface DetectedZone {
  label: string
  icon: string
  description: string
}

export interface CollectionSceneBrief {
  room: RoomProfile
  action: QuickAction
  refinementText: string
  collectionName: string
}

export interface EnhancedSceneBrief extends CollectionSceneBrief {
  id: string
  normalizedIntent: string
  renderPrompt: string
  createdAt: string
}

export type SetupStep = 'room-select' | 'actions'

export interface WidgetProduct {
  id: string
  title: string
  price: string
  material: string
  imageUrl?: string
}

export interface ShopifyApiProduct {
  id: number
  title: string
  handle: string
  product_type: string
  tags: string[]
  variants: Array<{ price: string }>
  images: Array<{ src: string }>
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'replace-existing', label: 'Replace existing cabinet', zone: 'Existing cabinet zone', icon: '🔄' },
  { id: 'near-tv',          label: 'Put near the TV',                  zone: 'TV zone',              icon: '📺' },
  { id: 'right-wall',       label: 'Place against the right wall',     zone: 'Right wall',            icon: '→'  },
  { id: 'back-wall',        label: 'Place against the back wall',      zone: 'Back wall',             icon: '↑'  },
  { id: 'front-existing',   label: 'Put in front of the existing cabinet', zone: 'Cabinet zone',     icon: '⬤' },
]

export function mapShopifyProduct(p: ShopifyApiProduct): WidgetProduct {
  const material = p.product_type
    || p.tags.find(t => !['side-cabinet', 'dressoir', 'opbergkast', 'kast'].includes(t))
    || 'Storage cabinet'
  return {
    id: String(p.id),
    title: p.title,
    price: p.variants[0]?.price ?? '0',
    material,
    imageUrl: p.images[0]?.src,
  }
}
