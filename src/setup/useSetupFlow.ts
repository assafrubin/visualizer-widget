import { useState, useCallback, useEffect } from 'react'
import type { CollectionSceneBrief, DetectedZone, QuickAction, RoomProfile, SetupStep } from '../types'
import type { Api } from '../api'

export type CameraEventName = 'camera_opened' | 'camera_capture' | 'camera_denied' | 'camera_error'

export interface SetupFlowConfig {
  api: Api
  activeBrief: CollectionSceneBrief | null
  collectionName: string
  onConfirm: (brief: CollectionSceneBrief) => void | Promise<void>
  onCameraEvent?: (event: CameraEventName) => void
}

export interface SetupModalProps {
  step: SetupStep
  room: RoomProfile | null
  action: QuickAction | null
  refinement: string
  rooms: RoomProfile[]
  zones: DetectedZone[]
  isLoadingRooms: boolean
  isLoadingZones: boolean
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

export function useSetupFlow({ api, activeBrief, collectionName, onConfirm, onCameraEvent }: SetupFlowConfig): {
  openSetup: () => void
  bindings: SetupFlowBindings
} {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<SetupStep>('room-select')
  const [room, setRoom] = useState<RoomProfile | null>(null)
  const [action, setAction] = useState<QuickAction | null>(null)
  const [refinement, setRefinement] = useState('')

  const [rooms, setRooms] = useState<RoomProfile[]>([])
  const [zones, setZones] = useState<DetectedZone[]>([])
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const [isLoadingZones, setIsLoadingZones] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    setIsLoadingRooms(true)
    api.getRooms()
      .then(setRooms)
      .catch(err => console.error('[VIR] getRooms failed:', err))
      .finally(() => setIsLoadingRooms(false))
  }, [api])

  const openSetup = useCallback(() => {
    if (activeBrief) {
      setRoom(activeBrief.room)
      setAction(activeBrief.action)
      setRefinement(activeBrief.refinementText)
      setStep('actions')
      setIsLoadingZones(true)
      api.analyzeRoom(activeBrief.room.id)
        .then(setZones)
        .catch(err => console.error('[VIR] analyzeRoom failed:', err))
        .finally(() => setIsLoadingZones(false))
    } else {
      setRoom(null)
      setAction(null)
      setRefinement('')
      setZones([])
      setStep('room-select')
    }
    setIsOpen(true)
  }, [activeBrief, api])

  const close = useCallback(() => setIsOpen(false), [])

  const handleRoomSelect = useCallback((r: RoomProfile) => setRoom(r), [])

  const handleRoomContinue = useCallback(() => {
    if (!room) return
    setStep('actions')
    setZones([])
    setIsLoadingZones(true)
    api.analyzeRoom(room.id)
      .then(setZones)
      .catch(err => console.error('[VIR] analyzeRoom failed:', err))
      .finally(() => setIsLoadingZones(false))
  }, [room, api])

  const handleChangeRoom = useCallback(() => {
    setStep('room-select')
    setZones([])
  }, [])

  const handleActionSelect = useCallback((a: QuickAction) => setAction(a), [])

  const handleRoomUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string
      const localRoom: RoomProfile = {
        id: 'uploaded-room',
        name: file.name.replace(/\.[^.]+$/, ''),
        bgColor: '#D0CFC4',
        accentColor: '#7A7A6A',
        floorColor: '#B8B5A5',
        isUploaded: true,
        imageDataUrl,
      }
      setRooms(prev => [...prev.filter(r => r.id !== 'uploaded-room'), localRoom])
      setRoom(localRoom)
      try {
        const serverRoom = await api.uploadRoom({ imageDataUrl, filename: file.name })
        setRooms(prev => prev.map(r => r.id === 'uploaded-room' ? { ...r, name: serverRoom.name } : r))
        setRoom(prev => prev?.id === 'uploaded-room' ? { ...prev, name: serverRoom.name } : prev)
      } catch (err) {
        console.error('[VIR] uploadRoom failed — proceeding with local only:', err)
      }
    }
    reader.readAsDataURL(file)
  }, [api])

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
      refinement,
      rooms,
      zones,
      isLoadingRooms,
      isLoadingZones,
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
