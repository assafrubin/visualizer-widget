import { useState, useEffect, useRef } from 'react'
import type { CollectionSceneBrief, EnhancedSceneBrief, WidgetProduct } from './types'
import { createApi, fetchShopifyProducts, isTerminalStatus } from './api'
import type { RenderJob } from './api'
import { WIDGET_CSS } from './styles'
import { useSetupFlow } from './setup/useSetupFlow'
import { SetupModal } from './setup/SetupModal'
import { InRoomPanel } from './InRoomPanel'
import { BRIEF_STORAGE_KEY } from './PDPWidget'

export interface WidgetProps {
  backofficeUrl: string
  collectionHandle: string
  collectionName: string
}

export function Widget({ backofficeUrl, collectionHandle, collectionName }: WidgetProps) {
  const api = useRef(createApi(backofficeUrl)).current
  const [products, setProducts] = useState<WidgetProduct[]>([])
  const [sceneBrief, setSceneBrief] = useState<EnhancedSceneBrief | null>(() => {
    try {
      const stored = sessionStorage.getItem(BRIEF_STORAGE_KEY)
      if (stored) { sessionStorage.removeItem(BRIEF_STORAGE_KEY); return JSON.parse(stored) as EnhancedSceneBrief }
    } catch { /* ignore */ }
    return null
  })
  const [renderJobs, setRenderJobs] = useState<Map<string, RenderJob>>(new Map())
  const inRoomMode = sceneBrief !== null

  useEffect(() => {
    fetchShopifyProducts(collectionHandle).then(setProducts)
  }, [collectionHandle])

  // Create render jobs for all products when brief changes
  useEffect(() => {
    if (!sceneBrief) { setRenderJobs(new Map()); return }
    const briefId = sceneBrief.id
    let cancelled = false
    setRenderJobs(new Map())

    Promise.all(
      products.map(p =>
        api.createRenderJob({
          briefId,
          productId: p.id,
          product: { title: p.title, material: p.material, cabinetColor: '' },
        })
          .then(job => [p.id, job] as const)
          .catch(() => null),
      ),
    ).then(results => {
      if (cancelled) return
      const map = new Map<string, RenderJob>()
      for (const r of results) { if (r) map.set(r[0], r[1]) }
      setRenderJobs(map)
    })

    return () => { cancelled = true }
  }, [sceneBrief?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll non-terminal jobs
  useEffect(() => {
    const active = [...renderJobs.entries()].filter(([, j]) => !isTerminalStatus(j.status))
    if (!active.length) return
    const timer = setInterval(() => {
      active.forEach(async ([productId, job]) => {
        try {
          const updated = await api.getRenderJob(job.jobId)
          setRenderJobs(prev => new Map(prev).set(productId, updated))
        } catch { /* ignore */ }
      })
    }, 3000)
    return () => clearInterval(timer)
  }, [renderJobs, api])

  const { openSetup, bindings } = useSetupFlow({
    api,
    activeBrief: sceneBrief,
    collectionName,
    onConfirm: async (draft: CollectionSceneBrief) => {
      const record = await api.createSceneBrief({
        roomId: draft.room.id,
        actionId: draft.action.id,
        refinementText: draft.refinementText,
        collectionName: draft.collectionName,
      })
      setSceneBrief({ ...draft, ...record })
    },
  })

  const { isOpen, ...modalProps } = bindings

  return (
    <div className="vir-widget">
      <style>{WIDGET_CSS}</style>

      {!inRoomMode && (
        <div className="vir-cta">
          <div className="vir-cta__icon">✦</div>
          <div className="vir-cta__text">
            <strong>See these in your room</strong>
            <span>Visualize any piece in your actual space — free, instant preview</span>
          </div>
          <button className="vir-cta__btn" onClick={openSetup}>
            Get started
          </button>
        </div>
      )}

      {inRoomMode && sceneBrief && (
        <InRoomPanel
          brief={sceneBrief}
          products={products}
          renderJobs={renderJobs}
          onEdit={openSetup}
          onClear={() => { setSceneBrief(null); setRenderJobs(new Map()) }}
        />
      )}

      {isOpen && (
        <div className="vir-widget">
          <SetupModal {...modalProps} contextLabel={collectionName} />
        </div>
      )}
    </div>
  )
}
