import { useRef } from 'react'
import type { CameraEventName } from '../useSetupFlow'

interface RoomSelectorProps {
  onUpload: (file: File) => void
  onCameraEvent?: (event: CameraEventName) => void
}

// Native capture is offered only on touch devices that support the `capture`
// attribute — this opens the OS camera full-screen instead of the in-browser viewfinder.
function shouldOfferNativeCapture(): boolean {
  if (typeof window === 'undefined') return false
  return navigator.maxTouchPoints > 1 && 'capture' in document.createElement('input')
}

export function RoomSelector({ onUpload, onCameraEvent }: RoomSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const captureInputRef = useRef<HTMLInputElement>(null)
  const useNativeCapture = shouldOfferNativeCapture()

  function handleFile(file: File, fromCamera: boolean) {
    if (fromCamera) onCameraEvent?.('camera_capture')
    onUpload(file)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>, fromCamera = false) {
    const file = e.target.files?.[0]
    if (file) handleFile(file, fromCamera)
    e.target.value = ''
  }

  if (useNativeCapture) {
    return (
      <div className="room-selector">
        <input
          ref={captureInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={e => handleFileInputChange(e, true)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={e => handleFileInputChange(e)}
        />
        <div className="upload-actions">
          <button
            className="upload-action-btn upload-action-btn--primary"
            onClick={() => {
              onCameraEvent?.('camera_opened')
              captureInputRef.current?.click()
            }}
          >
            <span className="upload-action-btn__icon">📷</span>
            <span className="upload-action-btn__label">Take a photo</span>
          </button>
          <button
            className="upload-action-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="upload-action-btn__icon">⬆</span>
            <span className="upload-action-btn__label">Upload a file</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="room-selector">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={e => handleFileInputChange(e)}
      />
      <button
        className="upload-dropzone"
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="upload-dropzone__icon">⬆</span>
        <span className="upload-dropzone__title">Upload a photo of your room</span>
        <span className="upload-dropzone__hint">JPG, PNG or WebP · your photo stays private</span>
        <span className="upload-dropzone__cta">Choose file</span>
      </button>
    </div>
  )
}
