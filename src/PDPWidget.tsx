import type { CollectionSceneBrief } from './types'
import type { PDPStore } from './pdpStore'
import type { Api } from './api'
import { trackWidgetEvent } from './api'
import { WIDGET_CSS } from './styles'
import { useSetupFlow } from './setup/useSetupFlow'
import { SetupModal } from './setup/SetupModal'
import { SceneBriefChips } from './setup/SceneBriefChips'

export const BRIEF_STORAGE_KEY = 'vir_imported_brief'

export interface PDPWidgetProps {
  api: Api
  store: PDPStore
  collectionHandle: string
  collectionName: string
  productTitle: string
  backofficeUrl: string
  shopDomain: string
}

export function PDPWidget({ api, store, collectionHandle, collectionName, productTitle, backofficeUrl, shopDomain }: PDPWidgetProps) {
  const { brief, renderJob } = store.usePDPStore()

  const track = (eventType: Parameters<typeof trackWidgetEvent>[1]) =>
    trackWidgetEvent(backofficeUrl, eventType, { shopDomain, surface: 'pdp' })

  const { openSetup, bindings } = useSetupFlow({
    api,
    activeBrief: brief,
    collectionName,
    onCameraEvent: (event) => track(event),
    onConfirm: async (draft: CollectionSceneBrief) => {
      track('setup_confirmed')
      const record = await api.createSceneBrief({
        roomId: draft.room.id,
        actionId: draft.action.id,
        refinementText: draft.refinementText,
        collectionName: draft.collectionName,
      })
      await store.setBrief({ ...draft, ...record })
    },
  })

  const { isOpen, ...modalProps } = bindings

  function handleNavigateToCollection() {
    if (!brief) return
    sessionStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(brief))
    window.location.href = `/collections/${collectionHandle}`
  }

  return (
    <div className="vir-widget">
      <style>{WIDGET_CSS}</style>

      {!brief ? (
        <div className="vir-cta">
          <div className="vir-cta__icon">✦</div>
          <div className="vir-cta__text">
            <strong>See this in your room</strong>
            <span>Free instant preview — no app needed</span>
          </div>
          <button className="vir-cta__btn" onClick={() => { track('setup_opened'); openSetup() }}>Try it</button>
        </div>
      ) : (
        <>
          <div className="vir-pdp-result">
            <div className="vir-pdp-result__header">
              <span className="in-room-banner__label">✦ Showing in your room</span>
              <SceneBriefChips brief={brief} variant="pill" />
              <div className="vir-pdp-result__header-actions">
                <button className="btn btn--ghost btn--sm" onClick={openSetup}>Edit</button>
                <button className="btn btn--ghost btn--sm" onClick={store.clear}>✕</button>
              </div>
            </div>

            <div className="vir-pdp-result__img">
              {(!renderJob || renderJob.status === 'submitted' || renderJob.status === 'processing') && (
                <div className="vir-pdp-result__generating">
                  <span className="vir-spinner vir-spinner--dark" />
                  Generating your room view…
                </div>
              )}
              {renderJob?.status === 'succeeded' && renderJob.imageUrl && (
                <img src={renderJob.imageUrl} alt={`${productTitle} in ${brief.room.name}`} />
              )}
              {renderJob?.status === 'failed' && (
                <div className="vir-pdp-result__generating">
                  <span style={{ fontSize: 28 }}>✦</span>
                  Render unavailable — try again
                </div>
              )}
            </div>
          </div>

          <div className="vir-bridge-cta">
            <div className="vir-bridge-cta__text">
              <strong>Want to see more {collectionName} in your {brief.room.name}?</strong>
              <span>Your room and placement carry over to the full collection.</span>
            </div>
            <button className="vir-cta__btn" onClick={handleNavigateToCollection}>
              Browse collection in your room →
            </button>
          </div>
        </>
      )}

      {isOpen && (
        <div className="vir-widget">
          <SetupModal {...modalProps} contextLabel={productTitle} />
        </div>
      )}
    </div>
  )
}
