import { useRef } from 'react'
import type { DetectedZone, RoomProfile } from '../../types'
import type { CameraEventName } from '../useSetupFlow'

interface RoomAnalysisProps {
  room: RoomProfile
  zones: DetectedZone[]
  isLoadingZones: boolean
  onChangeRoom: () => void
  onRoomUpload: (file: File) => void
  onCameraEvent?: (event: CameraEventName) => void
}

function isMobileWithCamera() {
  return (
    typeof navigator !== 'undefined' &&
    navigator.maxTouchPoints > 1 &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

export function RoomAnalysis({ room, zones, isLoadingZones, onChangeRoom, onRoomUpload, onCameraEvent: _onCameraEvent }: RoomAnalysisProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const showCamera = isMobileWithCamera()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onRoomUpload(file)
    e.target.value = ''
  }

  return (
    <div className="room-analysis">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="room-analysis__preview">
        {room.imageDataUrl ? (
          <img
            src={room.imageDataUrl}
            alt={room.name}
            style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block', borderRadius: '6px' }}
          />
        ) : (
          <svg width="100%" height="160" viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', borderRadius: '6px' }}>
            <rect width="320" height="160" fill={room.bgColor} />
            <rect x="0" y="122" width="320" height="38" fill={room.floorColor} />
            <rect x="140" y="68" width="44" height="54" rx="2" fill={room.accentColor} opacity="0.65" />
          </svg>
        )}
      </div>

      {/* Re-upload / retake actions */}
      <div className="room-analysis__change">
        {showCamera ? (
          <>
            <button className="btn btn--ghost btn--xs" onClick={onChangeRoom}>📷 Retake photo</button>
            <button className="btn btn--ghost btn--xs" onClick={() => fileInputRef.current?.click()}>⬆ New upload</button>
          </>
        ) : (
          <button className="btn btn--ghost btn--xs" onClick={() => fileInputRef.current?.click()}>⬆ Change photo</button>
        )}
      </div>

      <div className="room-analysis__zones" data-testid="zones-section">
        {isLoadingZones ? (
          <p className="room-analysis__zones-label">Analysing room…</p>
        ) : (
          <>
            <p className="room-analysis__zones-label">
              <span className="room-analysis__check">✓</span>
              We found {zones.length} placement zones in your room
            </p>
            <div className="zone-chips">
              {zones.map(zone => (
                <span key={zone.label} className="zone-chip" title={zone.description}>
                  <span className="zone-chip__icon">{zone.icon}</span>
                  {zone.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
