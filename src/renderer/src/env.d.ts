/// <reference types="electron-vite/node" />
/// <reference types="vite/client" />

import type { ElectronAPI } from '../../preload/index'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
