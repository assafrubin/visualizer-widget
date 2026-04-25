import { useEffect } from 'react'
import type { SetupModalProps } from './useSetupFlow'
import { RoomSelector } from './steps/RoomSelector'
import { RoomAnalysis } from './steps/RoomAnalysis'
import { QuickActionsPanel } from './steps/QuickActionsPanel'

export function SetupModal({
  step,
  room,
  action,
  refinement,
  rooms,
  zones,
  isLoadingRooms,
  isLoadingZones,
  isConfirming,
  onRoomSelect,
  onRoomContinue,
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="vir-modal-title">
        <div className="modal__header">
          <div className="modal__header-left">
            <span className="modal__collection-tag">{contextLabel}</span>
            <h2 className="modal__title" id="vir-modal-title">
              {step === 'room-select' ? 'See these in your room' : 'Set up your view'}
            </h2>
          </div>
          <div className="modal__header-right">
            <div className="modal__steps">
              <span className={`modal__step ${step === 'room-select' ? 'modal__step--active' : 'modal__step--done'}`}>
                1 Room
              </span>
              <span className="modal__step-sep">→</span>
              <span className={`modal__step ${step === 'actions' ? 'modal__step--active' : ''}`}>
                2 Placement
              </span>
            </div>
            <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="modal__body">
          {step === 'room-select' ? (
            <RoomSelector
              room={room}
              rooms={rooms}
              isLoading={isLoadingRooms}
              onSelect={onRoomSelect}
              onUpload={onRoomUpload}
              onCameraEvent={onCameraEvent}
            />
          ) : (
            <div className="modal__two-col">
              <div className="modal__col modal__col--analysis">
                {room && (
                  <RoomAnalysis
                    room={room}
                    zones={zones}
                    isLoadingZones={isLoadingZones}
                    onChangeRoom={onChangeRoom}
                  />
                )}
              </div>
              <div className="modal__col modal__col--actions">
                <QuickActionsPanel
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
            {step === 'room-select' ? (
              <button
                className="btn btn--primary"
                disabled={!room || isLoadingRooms}
                onClick={onRoomContinue}
              >
                Continue →
              </button>
            ) : (
              <button
                className="btn btn--primary"
                disabled={!canConfirm}
                onClick={onConfirm}
              >
                {isConfirming ? 'Setting up…' : '✦ See in room'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
