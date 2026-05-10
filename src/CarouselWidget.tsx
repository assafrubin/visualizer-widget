import type { CollectionSceneBrief } from './types'
import type { PDPStore } from './pdpStore'
import type { Api, AppearanceSettings } from './api'
import { trackWidgetEvent, DEFAULT_APPEARANCE } from './api'
import { WIDGET_CSS } from './styles'
import { useSetupFlow } from './setup/useSetupFlow'
import { SetupModal } from './setup/SetupModal'
import { useBackofficeImage } from './useBackofficeImage'
import { LottieLoader } from './LottieLoader'

export interface CarouselWidgetProps {
  api: Api
  store: PDPStore
  collectionName: string
  productTitle: string
  backofficeUrl: string
  shopDomain: string
  appearance?: AppearanceSettings
}

export function CarouselWidget({ api, store, collectionName, productTitle, backofficeUrl, shopDomain, appearance = DEFAULT_APPEARANCE }: CarouselWidgetProps) {
  const { brief, renderJob } = store.usePDPStore()

  const track = (eventType: Parameters<typeof trackWidgetEvent>[1]) =>
    trackWidgetEvent(backofficeUrl, eventType, { shopDomain, surface: 'pdp' })

  const { openSetup, bindings } = useSetupFlow({
    api,
    activeBrief: brief,
    collectionName,
    onCameraEvent: (event) => track(event),
    onConfirm: async (draft: CollectionSceneBrief) => {
      const record = await api.createSceneBrief({
        roomId: draft.room.id,
        actionId: draft.action.id,
        refinementText: draft.refinementText,
        collectionName: draft.collectionName,
      })
      // Preserve imageDataUrl — server's room object doesn't carry it.
      await store.setBrief({ ...draft, ...record, room: { ...record.room, imageDataUrl: draft.room.imageDataUrl } })
    },
  })

  const { isOpen, ...modalProps } = bindings

  const isLoading = brief && (!renderJob || renderJob.status === 'submitted' || renderJob.status === 'processing')
  const renderImgSrc = useBackofficeImage(renderJob?.status === 'succeeded' ? renderJob.imageUrl : null)

  const cssVars = { '--vir-accent': appearance.accentColor, '--vir-accent-text': appearance.accentTextColor } as React.CSSProperties

  return (
    <div className="vir-widget" style={cssVars}>
      <style>{WIDGET_CSS}</style>

      <div
        className={`vir-carousel-slot ${brief ? 'vir-carousel-slot--active' : ''}`}
        onClick={!brief ? openSetup : undefined}
        role={!brief ? 'button' : undefined}
        tabIndex={!brief ? 0 : undefined}
        onKeyDown={!brief ? (e) => { if (e.key === 'Enter' || e.key === ' ') openSetup() } : undefined}
        aria-label={!brief ? 'See this product in your room' : undefined}
      >
        {!brief && (
          <div className="vir-carousel-slot__placeholder">
            <span className="vir-carousel-slot__spark">✦</span>
            <span className="vir-carousel-slot__label">See it<br />in your room</span>
          </div>
        )}

        {isLoading && (
          <div className="vir-carousel-slot__loading">
            <LottieLoader size={80} />
            <span>Generating…</span>
          </div>
        )}

        {renderImgSrc && (
          <img
            src={renderImgSrc}
            alt={`${productTitle} in ${brief!.room.name}`}
            className="vir-carousel-slot__img"
          />
        )}

        {renderJob?.status === 'failed' && (
          <div className="vir-carousel-slot__placeholder">
            <span className="vir-carousel-slot__spark">✦</span>
            <span className="vir-carousel-slot__label">Render<br />unavailable</span>
          </div>
        )}

        {brief && (
          <div className="vir-carousel-slot__overlay">
            <span className="vir-carousel-slot__room-tag">
              ✦ {brief.room.name}
            </span>
            <button
              className="vir-carousel-slot__edit"
              onClick={(e) => { e.stopPropagation(); openSetup() }}
              aria-label="Edit room setup"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="vir-widget">
          <SetupModal {...modalProps} contextLabel={productTitle} />
        </div>
      )}
    </div>
  )
}
