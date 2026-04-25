import type { CollectionSceneBrief, WidgetProduct } from './types'
import type { RenderJob } from './api'
import { SceneBriefChips } from './setup/SceneBriefChips'

interface InRoomPanelProps {
  brief: CollectionSceneBrief
  products: WidgetProduct[]
  renderJobs: Map<string, RenderJob>
  onEdit: () => void
  onClear: () => void
}

function RenderCard({ product, job }: { product: WidgetProduct; job: RenderJob | undefined }) {
  const isLoading = !job || job.status === 'submitted' || job.status === 'processing'
  const isFailed = job?.status === 'failed'
  const imageUrl = job?.imageUrl

  return (
    <div className="vir-result-card">
      <div className="vir-result-card__img">
        {isLoading && (
          <div className="vir-result-card__skeleton">
            <span className="vir-spinner" />
          </div>
        )}
        {isFailed && !isLoading && (
          <div className="vir-result-card__skeleton vir-result-card__skeleton--error">
            <span style={{ fontSize: '20px' }}>✦</span>
          </div>
        )}
        {imageUrl && !isLoading && (
          <img src={imageUrl} alt={`${product.title} in room`} />
        )}
      </div>
      <div className="vir-result-card__info">
        <span className="vir-result-card__title">{product.title}</span>
        <span className="vir-result-card__price">€{product.price}</span>
      </div>
    </div>
  )
}

export function InRoomPanel({ brief, products, renderJobs, onEdit, onClear }: InRoomPanelProps) {
  return (
    <div className="vir-results">
      <div className="vir-results__header">
        <div className="vir-results__header-left">
          <div
            className="in-room-banner__room-swatch"
            style={{ backgroundColor: brief.room.bgColor, borderColor: brief.room.accentColor }}
          >
            <div className="in-room-banner__room-floor" style={{ backgroundColor: brief.room.floorColor }} />
          </div>
          <div>
            <div className="in-room-banner__top-line">
              <span className="in-room-banner__label">In-room view</span>
              <span className="in-room-banner__dot">·</span>
              <span className="in-room-banner__collection">{brief.collectionName}</span>
            </div>
            <div className="in-room-banner__bottom-line">
              <SceneBriefChips brief={brief} variant="plain" />
            </div>
          </div>
        </div>
        <div className="vir-results__header-actions">
          <button className="btn btn--ghost btn--sm" onClick={onEdit}>Edit</button>
          <button className="btn btn--ghost btn--sm" onClick={onClear} title="Exit in-room view">✕</button>
        </div>
      </div>
      <div className="vir-results__strip">
        {products.map(p => (
          <RenderCard key={p.id} product={p} job={renderJobs.get(p.id)} />
        ))}
      </div>
    </div>
  )
}
