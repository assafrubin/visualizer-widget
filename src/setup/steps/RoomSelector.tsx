import { useRef, useState, useEffect, useCallback } from 'react'
import type { RoomProfile } from '../../types'
import type { CameraEventName } from '../../setup/useSetupFlow'

interface RoomSelectorProps {
  room: RoomProfile | null
  rooms: RoomProfile[]
  isLoading: boolean
  onSelect: (room: RoomProfile) => void
  onUpload: (file: File) => void
  onCameraEvent?: (event: CameraEventName) => void
}

// Evaluated per-render so tests can stub navigator before rendering.
function isMobileWithCamera() {
  return (
    typeof navigator !== 'undefined' &&
    navigator.maxTouchPoints > 1 &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

type CameraState = 'idle' | 'requesting' | 'active' | 'denied'

function RoomThumbnail({ room }: { room: RoomProfile }) {
  if (room.imageDataUrl) {
    return (
      <img
        src={room.imageDataUrl}
        alt={room.name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    )
  }
  return (
    <svg width="160" height="110" viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="110" fill={room.bgColor} />
      <rect x="0" y="82" width="160" height="28" fill={room.floorColor} />
      <rect x="0" y="79" width="160" height="4" fill={room.accentColor} opacity="0.3" />
      <rect x="110" y="12" width="36" height="48" rx="2" fill="rgba(255,255,255,0.4)" stroke={room.accentColor} strokeWidth="1" opacity="0.6" />
      <line x1="128" y1="12" x2="128" y2="60" stroke={room.accentColor} strokeWidth="1" opacity="0.4" />
      <line x1="110" y1="36" x2="146" y2="36" stroke={room.accentColor} strokeWidth="1" opacity="0.4" />
      <rect x="12" y="62" width="70" height="22" rx="4" fill={room.accentColor} opacity="0.5" />
      <rect x="12" y="56" width="70" height="10" rx="3" fill={room.accentColor} opacity="0.35" />
      <rect x="10" y="38" width="26" height="26" rx="2" fill={room.accentColor} opacity="0.55" />
      <line x1="23" y1="38" x2="23" y2="64" stroke={room.bgColor} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function RoomSelector({ room, rooms, isLoading, onSelect, onUpload, onCameraEvent }: RoomSelectorProps) {
  const showCamera = isMobileWithCamera()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraState, setCameraState] = useState<CameraState>('idle')

  // Stop the stream on unmount so we never leave the camera indicator lit.
  useEffect(() => {
    return () => stopStream()
  }, [])

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const openCamera = useCallback(async () => {
    setCameraState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraState('active')
      onCameraEvent?.('camera_opened')
      // Attach stream to video element after React renders it
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()?.catch(() => {})
        }
      })
    } catch (err) {
      stopStream()
      // NotAllowedError = permission denied; NotFoundError = no camera at all
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError') {
        setCameraState('denied')
        onCameraEvent?.('camera_denied')
      } else {
        setCameraState('idle')
        onCameraEvent?.('camera_error')
      }
    }
  }, [onCameraEvent])

  function cancelCamera() {
    stopStream()
    setCameraState('idle')
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)

    canvas.toBlob(blob => {
      if (blob) {
        onUpload(new File([blob], 'room-photo.jpg', { type: 'image/jpeg' }))
        onCameraEvent?.('camera_capture')
      }
      stopStream()
      setCameraState('idle')
    }, 'image/jpeg', 0.85)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  return (
    <div className="room-selector">
      <div className="setup-section-header">
        <h3 className="setup-section-title">Choose a room</h3>
        <p className="setup-section-subtitle">
          We'll place each cabinet into your space so you can see how it fits.
        </p>
      </div>

      {isLoading ? (
        <div className="setup-loading">Loading rooms…</div>
      ) : (
        <div className="room-grid">
          {rooms.map(r => (
            <button
              key={r.id + (r.imageDataUrl ? '-uploaded' : '')}
              className={`room-card ${room?.id === r.id && room?.imageDataUrl === r.imageDataUrl ? 'room-card--selected' : ''}`}
              onClick={() => onSelect(r)}
            >
              <div className="room-card__thumbnail">
                <RoomThumbnail room={r} />
                {r.isUploaded && r.imageDataUrl && (
                  <span className="room-card__uploaded-tag">Your photo</span>
                )}
                {room?.id === r.id && room?.imageDataUrl === r.imageDataUrl && (
                  <div className="room-card__check">✓</div>
                )}
              </div>
              <span className="room-card__name">{r.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hidden canvas — used only to grab a still frame */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {cameraState === 'active' ? (
        <div className="vir-camera">
          <video
            ref={videoRef}
            className="vir-camera__viewfinder"
            playsInline
            muted
            autoPlay
          />
          <div className="vir-camera__actions">
            <button className="btn btn--ghost btn--sm" onClick={cancelCamera}>Cancel</button>
            <button className="vir-camera__shutter" onClick={capturePhoto} aria-label="Capture photo">
              <span className="vir-camera__shutter-ring" />
            </button>
            {/* spacer to keep shutter centred */}
            <span style={{ width: 72 }} />
          </div>
        </div>
      ) : (
        <div className="upload-zone">
          <div className="upload-zone__icon">{showCamera ? '📷' : '⬆'}</div>
          <div className="upload-zone__text">
            <strong>{showCamera ? 'Use your room' : 'Upload a room photo'}</strong>
            <span>
              {cameraState === 'denied'
                ? 'Camera blocked — allow access in browser settings'
                : 'Your photo stays private'}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {showCamera ? (
            <div className="upload-zone__mobile-btns">
              <button
                className="btn btn--primary btn--sm"
                onClick={openCamera}
                disabled={cameraState === 'requesting'}
              >
                {cameraState === 'requesting' ? '…' : 'Camera'}
              </button>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => fileInputRef.current?.click()}
              >
                File
              </button>
            </div>
          ) : (
            <button
              className="btn btn--outline btn--sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </button>
          )}
        </div>
      )}
    </div>
  )
}
