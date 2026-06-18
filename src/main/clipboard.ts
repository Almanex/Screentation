import { ipcMain, clipboard } from 'electron'
import crypto from 'crypto'
import { IPC } from '../shared/constants'
import type { ClipboardImage } from '../shared/types'

let lastImageHash: string | null = null

function computeHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex')
}

export function readClipboardImage(): ClipboardImage | null {
  const image = clipboard.readImage()
  if (image.isEmpty()) return null

  const pngBuffer = image.toPNG()
  if (pngBuffer.length === 0) return null

  const hash = computeHash(pngBuffer)

  // Deduplicate — don't return the same image twice
  if (hash === lastImageHash) return null
  lastImageHash = hash

  const size = image.getSize()
  return {
    dataUrl: image.toDataURL(),
    width: size.width,
    height: size.height
  }
}

export function forceReadClipboardImage(): ClipboardImage | null {
  const image = clipboard.readImage()
  if (image.isEmpty()) return null

  const pngBuffer = image.toPNG()
  if (pngBuffer.length === 0) return null

  lastImageHash = computeHash(pngBuffer)

  const size = image.getSize()
  return {
    dataUrl: image.toDataURL(),
    width: size.width,
    height: size.height
  }
}

export function registerClipboardHandlers(): void {
  ipcMain.handle(IPC.CLIPBOARD_READ, async () => {
    return forceReadClipboardImage()
  })
}
