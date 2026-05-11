import { useEffect, useRef } from 'react'
import type { CollectionSceneBrief } from './types'
import type { PDPStore } from './pdpStore'
import type { Api, AppearanceSettings } from './api'
import { trackWidgetEvent, DEFAULT_APPEARANCE } from './api'
import { WIDGET_CSS } from './styles'
import { useSetupFlow } from './setup/useSetupFlow'
import { SetupModal } from './setup/SetupModal'
import { useBackofficeImage } from './useBackofficeImage'
import { LottieLoader } from './LottieLoader'

export const BRIEF_STORAGE_KEY = 'vir_imported_brief'

export interface PDPWidgetProps {
  api: Api
  store: PDPStore
  collectionHandle: string
  collectionName: string
  productHandle: string
  productTitle: string
  productCategory?: string | null
  backofficeUrl: string
  shopDomain: string
  appearance?: AppearanceSettings
}

export function PDPWidget({ api, store, collectionName, productHandle, productTitle, productCategory, backofficeUrl, shopDomain, appearance = DEFAULT_APPEARANCE }: PDPWidgetProps) {
  const { brief, renderJob, renderTimedOut } = store.usePDPStore()
  const renderImgSrc = useBackofficeImage(renderJob?.status === 'succeeded' ? renderJob.imageUrl : null)
  const viewTrackedForJob = useRef<string | null>(null)

  const track = (eventType: Parameters<typeof trackWidgetEvent>[1]) =>
    trackWidgetEvent(backofficeUrl, eventType, { shopDomain, surface: 'pdp' })

  useEffect(() => {
    if (!renderImgSrc || !renderJob?.jobId || viewTrackedForJob.current === renderJob.jobId) return
    viewTrackedForJob.current = renderJob.jobId
    trackWidgetEvent(backofficeUrl, 'render_image_viewed', {
      shopDomain,
      surface: 'pdp',
      productId: productHandle,
      properties: { job_id: renderJob.jobId },
    })
  }, [renderImgSrc, renderJob?.jobId, backofficeUrl, shopDomain, productHandle])

  const { openSetup, bindings } = useSetupFlow({
    api,
    activeBrief: brief,
    collectionName,
    productCategory,
    onCameraEvent: (event) => track(event),
    onConfirm: async (draft: CollectionSceneBrief) => {
      track('setup_confirmed')
      const t0 = Date.now()
      const record = await api.createSceneBrief({
        roomId: draft.room.id,
        actionId: draft.action.id,
        refinementText: draft.refinementText,
        collectionName: draft.collectionName,
      })
      const t1 = Date.now()
      // Preserve the local imageDataUrl — the server's room object doesn't carry it.
      await store.setBrief(
        { ...draft, ...record, room: { ...record.room, imageDataUrl: draft.room.imageDataUrl } },
        { briefMs: t1 - t0, t1 },
      )
    },
  })

  const { isOpen, ...modalProps } = bindings

  const cssVars = { '--vir-accent': appearance.accentColor, '--vir-accent-text': appearance.accentTextColor } as React.CSSProperties

  return (
    <div className="vir-widget" style={cssVars}>
      <style>{WIDGET_CSS}</style>

      {!brief ? (
        <div className="vir-cta">
          <div className="vir-cta__icon">✦</div>
          <div className="vir-cta__text">
            <strong>{appearance.pdpCtaHeading}</strong>
            <span>{appearance.pdpCtaSubtext}</span>
          </div>
          <button className="vir-cta__btn" onClick={() => { track('setup_opened'); openSetup() }}>{appearance.pdpCtaButton}</button>
        </div>
      ) : (
        <div className="vir-pdp-render">
          {/* Always-visible dismiss button */}
          <button className="vir-pdp-render__close" onClick={store.clear} aria-label="Remove render">✕</button>

          {/* Generating */}
          {(!renderJob || renderJob.status === 'submitted' || renderJob.status === 'processing') && !renderTimedOut && (
            <div className="vir-pdp-render__generating">
              <LottieLoader size={120} />
              <span>Generating your room view…</span>
            </div>
          )}

          {/* Timed out */}
          {renderTimedOut && (
            <div className="vir-pdp-render__generating">
              <span style={{ fontSize: 22 }}>✦</span>
              <span>Having difficulties — please try again.</span>
              <button className="btn btn--outline btn--sm" onClick={store.retryRender} style={{ marginTop: 4 }}>Try again</button>
            </div>
          )}

          {/* Rendered image + edit FAB */}
          {renderJob?.status === 'succeeded' && renderImgSrc && (
            <>
              <img
                key={renderImgSrc}
                className="vir-pdp-render__img vir-pdp-render__img--reveal"
                src={renderImgSrc}
                alt={`${productTitle} in ${brief.room.name}`}
              />
              <button className="vir-pdp-render__fab" onClick={openSetup}>✦ Edit</button>
            </>
          )}

          {/* Failed (provider error, not timeout) */}
          {renderJob?.status === 'failed' && !renderTimedOut && (
            <div className="vir-pdp-render__generating">
              <span style={{ fontSize: 22 }}>✦</span>
              <span>Render unavailable</span>
              <button className="btn btn--outline btn--sm" onClick={openSetup} style={{ marginTop: 4 }}>Try again</button>
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <div className="vir-widget">
          <SetupModal {...modalProps} contextLabel={productTitle} />
        </div>
      )}
    </div>
  )
}
