import { StrictMode, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Widget } from './Widget'
import { PDPWidget } from './PDPWidget'
import { CarouselWidget } from './CarouselWidget'
import { RecommendationsWidget } from './RecommendationsWidget'
import { createApi } from './api'
import { createPDPStore } from './pdpStore'

const mode = new URLSearchParams(window.location.search).get('mode')

function PDPDevSandbox() {
  const api = useRef(createApi('http://localhost:3002')).current
  const store = useRef(createPDPStore(api, 'dressoir-lucca', 'Dressoir Lucca', 'dev.myshopify.com')).current
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: (mode === 'all' || mode === 'carousel') ? '1fr 200px' : '1fr', gap: 24, alignItems: 'start' }}>
        {(mode === 'pdp' || mode === 'all') && (
          <PDPWidget
            api={api}
            store={store}
            collectionHandle="side-cabinets"
            collectionName="Side Cabinets"
            productTitle="Dressoir Lucca"
            backofficeUrl="http://localhost:3002"
            shopDomain="dev.myshopify.com"
          />
        )}
        {(mode === 'carousel' || mode === 'all') && (
          <CarouselWidget
            api={api}
            store={store}
            collectionName="Side Cabinets"
            productTitle="Dressoir Lucca"
            backofficeUrl="http://localhost:3002"
            shopDomain="dev.myshopify.com"
          />
        )}
      </div>
      {(mode === 'rec' || mode === 'all') && (
        <RecommendationsWidget
          api={api}
          store={store}
          productHandle="dressoir-lucca"
          collectionHandle="side-cabinets"
          shopDomain="dev.myshopify.com"
          collectionName="Side Cabinets"
        />
      )}
    </div>
  )
}

const root = document.getElementById('vir-dev-root')!
createRoot(root).render(
  <StrictMode>
    {!mode || mode === 'collection' ? (
      <Widget
        backofficeUrl="http://localhost:3002"
        collectionHandle="side-cabinets"
        collectionName="Side Cabinets"
      />
    ) : (
      <PDPDevSandbox />
    )}
  </StrictMode>,
)
