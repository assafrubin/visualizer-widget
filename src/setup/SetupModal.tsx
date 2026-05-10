import { useEffect, useRef } from 'react'
import type { SetupModalProps } from './useSetupFlow'
import { RoomSelector } from './steps/RoomSelector'
import { QuickActionsPanel } from './steps/QuickActionsPanel'

function isMobileWithCamera() {
  return (
    typeof navigator !== 'undefined' &&
    navigator.maxTouchPoints > 1 &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

export function SetupModal({
  step,
  room,
  action,
  actions,
  isLoadingActions,
  refinement,
  collectionName: _collectionName,
  isConfirming,
  onActionSelect,
  onRefinementChange,
  onChangeRoom,
  onRoomUpload,
  onCameraEvent,
  onConfirm,
  onClose,
  canConfirm,
  contextLabel = 'Products',
}: SetupModalProps & { contextLabel?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const showCamera = isMobileWithCamera()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onRoomUpload(file)
    e.target.value = ''
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="vir-modal-title">

        <div className="modal__header">
          <div className="modal__header-left">
            <span className="modal__collection-tag">{contextLabel}</span>
            <h2 className="modal__title" id="vir-modal-title">See this in your room</h2>
          </div>
          <div className="modal__header-right">
            {step === 'actions' && (
              <div className="modal__steps">
                <span className="modal__step modal__step--done">1 Photo</span>
                <span className="modal__step-sep">→</span>
                <span className="modal__step modal__step--active">2 Placement</span>
              </div>
            )}
            <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="modal__body">
          {step === 'room-select' ? (
            <>
              <p className="setup-upload-subtitle">We'll use it to show this product in your space.</p>
              <RoomSelector onUpload={onRoomUpload} onCameraEvent={onCameraEvent} />
            </>
          ) : (
            <div className="placement-layout">

              {/* Room photo — full-width, contain, change button floats top-right */}
              {room?.imageDataUrl && (
                <div className="placement-photo">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <img
                    src={room.imageDataUrl}
                    alt="Your room"
                    className="placement-photo__img"
                  />
                  <div className="placement-photo__change">
                    {showCamera && (
                      <button className="placement-photo__btn" onClick={onChangeRoom}>
                        📷 Retake
                      </button>
                    )}
                    <button
                      className="placement-photo__btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      ⬆ Change photo
                    </button>
                  </div>
                </div>
              )}

              {/* Placement section */}
              <div className="placement-section">
                <div className="placement-section__header">
                  <h3 className="placement-section__title">Choose a placement</h3>
                  <p className="placement-section__subtitle">
                    Tell us where this product should appear in your room.
                  </p>
                </div>
                <QuickActionsPanel
                  actions={actions}
                  isLoadingActions={isLoadingActions}
                  action={action}
                  refinement={refinement}
                  onSelectAction={onActionSelect}
                  onRefinementChange={onRefinementChange}
                />
              </div>

            </div>
          )}
        </div>

        <div className="modal__footer">
          {step === 'actions' && (
            <button className="btn btn--ghost" onClick={onChangeRoom} disabled={isConfirming}>
              ← Back
            </button>
          )}
          <div className="modal__footer-right">
            <button className="btn btn--ghost" onClick={onClose} disabled={isConfirming}>
              Cancel
            </button>
            {step === 'actions' && (
              <button
                className="btn btn--primary"
                disabled={!canConfirm}
                onClick={onConfirm}
              >
                {isConfirming ? 'Setting up…' : '✦ Preview in my room'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
