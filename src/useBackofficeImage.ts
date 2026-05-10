import { useState, useEffect } from 'react'

// Fetches an image URL via JS so we can attach the ngrok-skip-browser-warning header.
// Without this, ngrok returns its HTML interstitial page on mobile instead of the image bytes.
export function useBackofficeImage(url: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!url) { setSrc(null); return }

    let revoked = false
    let objectUrl: string | null = null

    fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.blob()
      })
      .then(blob => {
        if (revoked) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!revoked) setSrc(url) // fall back to direct URL
      })

    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setSrc(null)
    }
  }, [url])

  return src
}
