import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RoomSelector } from './RoomSelector'
import type { RoomProfile } from '../../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const rooms: RoomProfile[] = [
  { id: 'living-room', name: 'Living Room', bgColor: '#F0EDE8', accentColor: '#8B7355', floorColor: '#D4C5B0', isUploaded: false },
  { id: 'tv-room',     name: 'TV Room',     bgColor: '#E8E4DF', accentColor: '#6B5D52', floorColor: '#C8B99A', isUploaded: false },
]

const baseProps = {
  room: null,
  rooms,
  isLoading: false,
  onSelect: vi.fn(),
  onUpload: vi.fn(),
  onCameraEvent: vi.fn(),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockStream(trackStop = vi.fn()): MediaStream {
  return {
    getTracks: () => [{ stop: trackStop }],
  } as unknown as MediaStream
}

function stubMobileNavigator(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 2, writable: true, configurable: true })
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    writable: true,
    configurable: true,
  })
}

function restoreDesktopNavigator() {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, writable: true, configurable: true })
  Object.defineProperty(navigator, 'mediaDevices', {
    value: undefined,
    writable: true,
    configurable: true,
  })
}

// ─── Desktop ──────────────────────────────────────────────────────────────────

describe('RoomSelector (desktop)', () => {
  beforeEach(() => restoreDesktopNavigator())

  it('renders preset room cards', () => {
    render(<RoomSelector {...baseProps} />)
    expect(screen.getByText('Living Room')).toBeInTheDocument()
    expect(screen.getByText('TV Room')).toBeInTheDocument()
  })

  it('shows a single "Choose file" button, no camera button', () => {
    render(<RoomSelector {...baseProps} />)
    expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /camera/i })).not.toBeInTheDocument()
  })

  it('calls onUpload when a file is selected via file input', async () => {
    const onUpload = vi.fn()
    render(<RoomSelector {...baseProps} onUpload={onUpload} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'room.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it('calls onSelect when a room card is clicked', () => {
    const onSelect = vi.fn()
    render(<RoomSelector {...baseProps} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Living Room'))
    expect(onSelect).toHaveBeenCalledWith(rooms[0])
  })

  it('shows loading state instead of room grid', () => {
    render(<RoomSelector {...baseProps} isLoading />)
    expect(screen.queryByText('Living Room')).not.toBeInTheDocument()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('marks the selected room with a check', () => {
    render(<RoomSelector {...baseProps} room={rooms[0]} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})

// ─── Mobile (getUserMedia available) ─────────────────────────────────────────

describe('RoomSelector (mobile — camera available)', () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>
  let trackStop: ReturnType<typeof vi.fn>

  beforeEach(() => {
    trackStop = vi.fn()
    mockGetUserMedia = vi.fn()
    stubMobileNavigator(mockGetUserMedia)
  })

  afterEach(() => {
    restoreDesktopNavigator()
    vi.clearAllMocks()
  })

  it('shows "Camera" and "File" buttons instead of the single "Choose file" button', () => {
    render(<RoomSelector {...baseProps} />)
    expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /file/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /choose file/i })).not.toBeInTheDocument()
  })

  it('shows upload prompt text for mobile', () => {
    render(<RoomSelector {...baseProps} />)
    expect(screen.getByText(/use your room/i)).toBeInTheDocument()
  })

  it('calls getUserMedia with environment-facing camera on Camera button click', async () => {
    mockGetUserMedia.mockResolvedValue(makeMockStream(trackStop))
    render(<RoomSelector {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /camera/i }))
    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ video: expect.objectContaining({ facingMode: 'environment' }) })
    ))
  })

  it('fires camera_opened event when stream starts', async () => {
    const onCameraEvent = vi.fn()
    mockGetUserMedia.mockResolvedValue(makeMockStream(trackStop))
    render(<RoomSelector {...baseProps} onCameraEvent={onCameraEvent} />)
    fireEvent.click(screen.getByRole('button', { name: /camera/i }))
    await waitFor(() => expect(onCameraEvent).toHaveBeenCalledWith('camera_opened'))
  })

  it('shows the viewfinder UI after the stream starts', async () => {
    mockGetUserMedia.mockResolvedValue(makeMockStream(trackStop))
    render(<RoomSelector {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /camera/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /capture photo/i })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('stops the stream and returns to idle when Cancel is clicked', async () => {
    mockGetUserMedia.mockResolvedValue(makeMockStream(trackStop))
    render(<RoomSelector {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /camera/i }))
    await waitFor(() => screen.getByRole('button', { name: /cancel/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(trackStop).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument())
  })

  it('calls onUpload and fires camera_capture when Capture is clicked', async () => {
    const onUpload = vi.fn()
    const onCameraEvent = vi.fn()
    mockGetUserMedia.mockResolvedValue(makeMockStream(trackStop))

    // Mock canvas.toBlob to call the callback synchronously with a fake blob
    const fakeBlob = new Blob(['img'], { type: 'image/jpeg' })
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(fakeBlob))
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as unknown as typeof HTMLCanvasElement.prototype.getContext

    render(<RoomSelector {...baseProps} onUpload={onUpload} onCameraEvent={onCameraEvent} />)
    fireEvent.click(screen.getByRole('button', { name: /camera/i }))
    await waitFor(() => screen.getByRole('button', { name: /capture photo/i }))
    fireEvent.click(screen.getByRole('button', { name: /capture photo/i }))

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(expect.any(File)))
    expect(onCameraEvent).toHaveBeenCalledWith('camera_capture')
    expect(trackStop).toHaveBeenCalled()
  })

  it('shows denied state and fires camera_denied on NotAllowedError', async () => {
    const onCameraEvent = vi.fn()
    const error = new DOMException('Permission denied', 'NotAllowedError')
    mockGetUserMedia.mockRejectedValue(error)

    render(<RoomSelector {...baseProps} onCameraEvent={onCameraEvent} />)
    fireEvent.click(screen.getByRole('button', { name: /camera/i }))

    await waitFor(() => expect(onCameraEvent).toHaveBeenCalledWith('camera_denied'))
    expect(screen.getByText(/camera blocked/i)).toBeInTheDocument()
  })

  it('returns to idle and fires camera_error on other getUserMedia errors', async () => {
    const onCameraEvent = vi.fn()
    mockGetUserMedia.mockRejectedValue(new DOMException('No device', 'NotFoundError'))

    render(<RoomSelector {...baseProps} onCameraEvent={onCameraEvent} />)
    fireEvent.click(screen.getByRole('button', { name: /camera/i }))

    await waitFor(() => expect(onCameraEvent).toHaveBeenCalledWith('camera_error'))
    // Returns to idle — camera button is available again
    expect(screen.getByRole('button', { name: /camera/i })).toBeInTheDocument()
  })

  it('file input still works on mobile as fallback', async () => {
    const onUpload = vi.fn()
    render(<RoomSelector {...baseProps} onUpload={onUpload} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'room.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it('Camera button is disabled while requesting permission', async () => {
    // Never resolves — stays in requesting state
    mockGetUserMedia.mockReturnValue(new Promise(() => {}))
    render(<RoomSelector {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /camera/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /…/ })).toBeDisabled()
    )
  })
})
