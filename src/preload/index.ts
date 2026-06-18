import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/constants'
import type { ClipboardImage, SaveImageParams, SaveAllParams, AppSettings } from '../shared/types'

export interface ElectronAPI {
  readClipboardImage: () => Promise<ClipboardImage | null>
  selectFolder: () => Promise<string | null>
  saveImage: (params: SaveImageParams) => Promise<string>
  saveAllImages: (params: SaveAllParams) => Promise<string[]>
  getSettings: () => Promise<AppSettings>
  setSettings: (settings: Partial<AppSettings>) => Promise<void>
  onNewClipboardImage: (callback: (image: ClipboardImage) => void) => () => void
}

const api: ElectronAPI = {
  readClipboardImage: () => ipcRenderer.invoke(IPC.CLIPBOARD_READ),
  selectFolder: () => ipcRenderer.invoke(IPC.DIALOG_SELECT_FOLDER),
  saveImage: (params) => ipcRenderer.invoke(IPC.FILE_SAVE_IMAGE, params),
  saveAllImages: (params) => ipcRenderer.invoke(IPC.FILE_SAVE_ALL, params),
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  setSettings: (settings) => ipcRenderer.invoke(IPC.SETTINGS_SET, settings),

  onNewClipboardImage: (callback: (image: ClipboardImage) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, image: ClipboardImage): void => {
      callback(image)
    }
    ipcRenderer.on(IPC.CLIPBOARD_NEW_IMAGE, handler)
    return () => {
      ipcRenderer.removeListener(IPC.CLIPBOARD_NEW_IMAGE, handler)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
