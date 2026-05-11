import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomSelector } from './RoomSelector'

const baseProps = {
  onUpload: vi.fn(),
  onCameraEvent: vi.fn(),
}

function stubNativeCapture() {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 2, writable: true, configurable: true })
  Object.defineProperty(HTMLInputElement.prototype, 'capture', { value: '', configurable: true, writable: true })
}

function restoreDesktop() {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, writable: true, configurable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (HTMLInputElement.prototype as any).capture
}

// ─── Desktop ──────────────────────────────────────────────────────────────────

describe('RoomSelector (desktop)', () => {
  beforeEach(() => {
    restoreDesktop()
    vi.clearAllMocks()
  })

  it('renders the upload dropzone with "Choose file" text', () => {
    render(<RoomSelector {...baseProps} />)
    expect(screen.getByText(/choose file/i)).toBeInTheDocument()
  })

  it('shows a single upload area, no camera button', () => {
    render(<RoomSelector {...baseProps} />)
    expect(screen.queryByRole('button', { name: /take a photo/i })).not.toBeInTheDocument()
  })

  it('calls onUpload when a file is selected via file input', () => {
    const onUpload = vi.fn()
    render(<RoomSelector {...baseProps} onUpload={onUpload} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'room.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onUpload).toHaveBeenCalledWith(file)
  })

  it('does not fire camera_capture when uploading via file input', () => {
    const onCameraEvent = vi.fn()
    render(<RoomSelector {...baseProps} onCameraEvent={onCameraEvent} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'room.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onCameraEvent).not.toHaveBeenCalledWith('camera_capture')
  })
})

// ─── Mobile (native capture) ──────────────────────────────────────────────────

describe('RoomSelector (mobile — native capture)', () => {
  beforeEach(() => {
    stubNativeCapture()
    vi.clearAllMocks()
  })

  afterEach(() => {
    restoreDesktop()
  })

  it('shows "Take a photo" and "Upload a file" buttons', () => {
    render(<RoomSelector {...baseProps} />)
    expect(screen.getByRole('button', { name: /take a photo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload a file/i })).toBeInTheDocument()
  })

  it('does not show the desktop dropzone on mobile', () => {
    render(<RoomSelector {...baseProps} />)
    expect(screen.queryByText(/choose file/i)).not.toBeInTheDocument()
  })

  it('fires camera_opened when the camera button is clicked', () => {
    const onCameraEvent = vi.fn()
    render(<RoomSelector {...baseProps} onCameraEvent={onCameraEvent} />)
    fireEvent.click(screen.getByRole('button', { name: /take a photo/i }))
    expect(onCameraEvent).toHaveBeenCalledWith('camera_opened')
  })

  it('calls onUpload and fires camera_capture when a photo is selected via the capture input', () => {
    const onUpload = vi.fn()
    const onCameraEvent = vi.fn()
    render(<RoomSelector onUpload={onUpload} onCameraEvent={onCameraEvent} />)
    const captureInput = document.querySelector('input[capture]') as HTMLInputElement
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(captureInput, { target: { files: [file] } })
    expect(onUpload).toHaveBeenCalledWith(file)
    expect(onCameraEvent).toHaveBeenCalledWith('camera_capture')
  })

  it('calls onUpload without camera_capture when uploading via the file input', () => {
    const onUpload = vi.fn()
    const onCameraEvent = vi.fn()
    render(<RoomSelector onUpload={onUpload} onCameraEvent={onCameraEvent} />)
    const fileInput = document.querySelector('input[accept="image/jpeg,image/png,image/webp"]') as HTMLInputElement
    const file = new File(['img'], 'room.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(onUpload).toHaveBeenCalledWith(file)
    expect(onCameraEvent).not.toHaveBeenCalledWith('camera_capture')
  })
})
