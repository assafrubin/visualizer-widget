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
  | 'replace-sofa'
  | 'replace-armchair'
  | 'replace-cabinet'
  | 'replace-coffee-table'
  | 'replace-rug'
  | 'replace-lamp'
  | 'replace-dining-table'
  | 'add-left-wall'
  | 'add-right-wall'
  | 'add-corner'
  | 'add-center'
  | 'add-under-window'
  | 'add-beside-sofa'
  | 'add-floating'

export interface QuickAction {
  id: QuickActionId
  label: string
  icon: string
  renderInstruction: string
  isReplace: boolean
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
  handle: string
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

export function mapShopifyProduct(p: ShopifyApiProduct): WidgetProduct {
  const material = p.product_type
    || p.tags.find(t => !['side-cabinet', 'dressoir', 'opbergkast', 'kast'].includes(t))
    || 'Storage cabinet'
  return {
    id: String(p.id),
    handle: p.handle,
    title: p.title,
    price: p.variants[0]?.price ?? '0',
    material,
    imageUrl: p.images[0]?.src,
  }
}
