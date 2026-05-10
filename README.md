# Widget

Embeddable IIFE script that runs on Shopify storefronts. Customers upload a room photo, pick a placement, and see the product rendered inside their room. No backend — browser-only code.

## Build

```bash
npm run build    # outputs dist/widget.iife.js (single self-contained file)
```

`dist/` is gitignored. After building, the backoffice serves `widget.iife.js` at `/widget.js`. When deploying to Shopify, also push the updated file to Shopify theme assets (Shopify CDN caches its own copy independently of backoffice).

## How it's embedded

Merchants add a script tag to their Shopify theme:

```html
<script
  src="https://<backoffice-ngrok-url>/widget.js"
  data-backoffice-url="https://<backoffice-ngrok-url>"
  data-shop-domain="merchant.myshopify.com"
></script>
```

Optional attributes:
- `data-collection-handle` — override auto-detected collection
- `data-collection-name` — override display name

## Entry logic (`src/entry.ts`)

1. Reads `data-*` from the script tag
2. Parses page URL for collection/product handles
3. Infers collection from breadcrumb links (PDP pages only)
4. Fetches config from backoffice:
   - Collection pages → `GET /api/public/config?shop=&collection=`
   - PDP pages → `GET /api/public/pdp-config?shop=&handle=` (server resolves product → collection)
5. Mounts React widgets based on enabled flags:

| Flag | Widget | Mount target |
|------|--------|-------------|
| `collectionEnabled` | `<Widget>` | before product grid |
| `pdpCtaEnabled` | `<PDPWidget>` | before add-to-cart form |
| `pdpCarouselEnabled` | `<CarouselWidget>` | inside image carousel (`[data-vir-carousel-slot]` or theme selectors) |
| `pdpRecommendationsEnabled` | `<RecommendationsWidget>` | after `.product-recommendations` or in `<main>` |

## Setup flow (`src/setup/useSetupFlow.ts`)

State machine managing the room selection + action selection modal:

1. **room-select step**: Customer uploads room photo
   - `POST /api/rooms/upload` with base64 → visualizer analyzes room via GPT-4o → returns actions
2. **actions step**: Customer picks a placement action
   - Actions are the GPT-4o-selected subset of the 14 predefined `QuickAction` items
3. **Confirm**: `POST /api/scene-briefs` → `POST /api/render-jobs`
   - Brief creation is synchronous (no LLM). Render is async — widget polls until `succeeded`.

On re-open with an existing brief, validates the saved action ID against a fresh action list (guards against stale IDs after server-side updates).

## API calls (`src/api.ts`)

All calls go to the backoffice URL (which proxies to visualizer):

```
GET  /api/public/config          Fetch collection config + enabled flags
GET  /api/public/pdp-config      Fetch PDP config + productCategory
GET  /api/public/appearance      Fetch appearance settings (accent color, CTA text, etc.)
POST /api/rooms/upload           Upload room photo (base64), get QuickAction[]
POST /api/rooms/:id/analysis     Re-analyze room (fallback)
POST /api/scene-briefs           Create scene brief (roomId + actionId + refinement)
GET  /api/scene-briefs/:id       Fetch brief
POST /api/render-jobs            Submit render job
GET  /api/render-jobs/:id        Poll render status
GET  /api/render-jobs/:id/image  Fetch rendered image
POST /api/events                 Track analytics events
```

## Key types (`src/types.ts`)

```ts
RoomProfile      // preset or uploaded room (id, name, colors, imageDataUrl)
QuickAction      // { id, label, icon, renderInstruction, isReplace }
QuickActionId    // 14 stable IDs: replace-sofa | replace-rug | add-left-wall | ...
CollectionSceneBrief  // room + action + refinementText + collectionName
```

## Key architectural decisions

- **Single IIFE bundle**: zero dependencies on the host page's framework. Works on any Shopify theme.
- **All traffic through backoffice**: widget never calls visualizer directly. One origin = simple Shopify CSP.
- **Base64 upload**: room photos sent as base64 JSON (20 MB limit on backoffice + visualizer).
- **URL hydration**: if `?vir_job_id=` is in the URL, widget pre-loads that job and brief on mount (supports email/share deep-links).
- **Closed action set**: widget renders whatever action list the server returns — it never hardcodes placement options. Actions come entirely from visualizer's `server/data.ts`.
