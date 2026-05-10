import { useState, useCallback } from 'react'
import type { CollectionSceneBrief, QuickAction, RoomProfile, SetupStep } from '../types'
import type { Api } from '../api'

export type CameraEventName = 'camera_opened' | 'camera_capture' | 'camera_denied' | 'camera_error'

export interface SetupFlowConfig {
  api: Api
  activeBrief: CollectionSceneBrief | null
  collectionName: string
  productCategory?: string | null
  onConfirm: (brief: CollectionSceneBrief) => void | Promise<void>
  onCameraEvent?: (event: CameraEventName) => void
}

export interface SetupModalProps {
  step: SetupStep
  room: RoomProfile | null
  action: QuickAction | null
  actions: QuickAction[]
  isLoadingActions: boolean
  refinement: string
  collectionName: string
  isConfirming: boolean
  onRoomSelect: (room: RoomProfile) => void
  onRoomContinue: () => void
  onActionSelect: (action: QuickAction) => void
  onRefinementChange: (text: string) => void
  onChangeRoom: () => void
  onRoomUpload: (file: File) => void
  onCameraEvent: (event: CameraEventName) => void
  onConfirm: () => void
  onClose: () => void
  canConfirm: boolean
}

export interface SetupFlowBindings extends SetupModalProps {
  isOpen: boolean
}

export function useSetupFlow({ api, activeBrief, collectionName, productCategory, onConfirm, onCameraEvent }: SetupFlowConfig): {
  openSetup: () => void
  bindings: SetupFlowBindings
} {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<SetupStep>('room-select')
  const [room, setRoom] = useState<RoomProfile | null>(null)
  const [action, setAction] = useState<QuickAction | null>(null)
  const [refinement, setRefinement] = useState('')
  const [actions, setActions] = useState<QuickAction[]>([])
  const [isLoadingActions, setIsLoadingActions] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const fetchActions = useCallback(async (roomId: string): Promise<QuickAction[]> => {
    setIsLoadingActions(true)
    try {
      const fetched = await api.analyzeRoom(roomId, { productCategory })
      setActions(fetched)
      return fetched
    } catch (err) {
      console.error('[VIR] analyzeRoom failed:', err)
      return []
    } finally {
      setIsLoadingActions(false)
    }
  }, [api, productCategory])

  const openSetup = useCallback(() => {
    if (activeBrief) {
      setRoom(activeBrief.room)
      setRefinement(activeBrief.refinementText)
      setStep('actions')
      // Fetch the current action list, then restore the previous selection only if
      // its ID is still valid — guards against stale IDs after a server-side update.
      fetchActions(activeBrief.room.id).then(fetched => {
        const valid = fetched.find(a => a.id === activeBrief.action.id)
        setAction(valid ?? null)
      })
    } else if (room?.imageDataUrl) {
      setStep('actions')
      if (actions.length === 0) {
        fetchActions('uploaded-room')
      }
    } else {
      setRoom(null)
      setAction(null)
      setRefinement('')
      setActions([])
      setStep('room-select')
    }
    setIsOpen(true)
  }, [activeBrief, room, actions, fetchActions])

  const close = useCallback(() => setIsOpen(false), [])

  const handleRoomSelect = useCallback((r: RoomProfile) => setRoom(r), [])

  const handleRoomContinue = useCallback(() => {
    if (!room) return
    setStep('actions')
    setActions([])
    fetchActions(room.id)
  }, [room, fetchActions])

  const handleChangeRoom = useCallback(() => {
    setStep('room-select')
    setActions([])
  }, [])

  const handleActionSelect = useCallback((a: QuickAction) => setAction(a), [])

  const handleRoomUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string
      const tempRoom: RoomProfile = {
        id: 'uploaded-room',
        name: file.name.replace(/\.[^.]+$/, ''),
        bgColor: '#D0CFC4', accentColor: '#7A7A6A', floorColor: '#B8B5A5',
        isUploaded: true, imageDataUrl,
      }
      setRoom(tempRoom)
      setStep('actions')
      setActions([])
      setIsLoadingActions(true)
      try {
        const { room: serverRoom, actions: contextualActions } = await api.uploadRoom({
          imageDataUrl,
          filename: file.name,
          productCategory,
        })
        const newActions = contextualActions ?? []
        setRoom({ ...serverRoom, imageDataUrl, isUploaded: true })
        setActions(newActions)
        // Clear selected action if it's not in the new list
        setAction(prev => newActions.find(a => a.id === prev?.id) ?? null)
      } catch (err) {
        console.error('[VIR] upload failed:', err)
      } finally {
        setIsLoadingActions(false)
      }
    }
    reader.readAsDataURL(file)
  }, [api, productCategory])

  const handleConfirm = useCallback(async () => {
    if (!room || !action || isConfirming) return
    const draftBrief: CollectionSceneBrief = { room, action, refinementText: refinement, collectionName }
    setIsConfirming(true)
    try {
      await onConfirm(draftBrief)
      setIsOpen(false)
    } catch (err) {
      console.error('[VIR] onConfirm failed:', err)
    } finally {
      setIsConfirming(false)
    }
  }, [room, action, refinement, collectionName, isConfirming, onConfirm])

  return {
    openSetup,
    bindings: {
      isOpen,
      step,
      room,
      action,
      actions,
      isLoadingActions,
      refinement,
      collectionName,
      isConfirming,
      onRoomSelect: handleRoomSelect,
      onRoomContinue: handleRoomContinue,
      onActionSelect: handleActionSelect,
      onRefinementChange: setRefinement,
      onChangeRoom: handleChangeRoom,
      onRoomUpload: handleRoomUpload,
      onCameraEvent: onCameraEvent ?? (() => {}),
      onConfirm: handleConfirm,
      onClose: close,
      canConfirm: !!room && !!action && !isConfirming,
    },
  }
}
