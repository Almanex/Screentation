import { app, BrowserWindow, shell, Tray, Menu, nativeImage, ipcMain } from 'electron'
import path from 'path'
import Store from 'electron-store'
import { registerClipboardHandlers, readClipboardImage } from './clipboard'
import { registerFileHandlers } from './file-service'
import { registerImageHandlers } from './image-service'
import { IPC, DEFAULTS } from '../shared/constants'
import type { AppSettings } from '../shared/types'

const store = new Store<AppSettings>({
  defaults: {
    outputDir: app.getPath('pictures'),
    fileNameTemplate: DEFAULTS.FILE_NAME_TEMPLATE,
    format: DEFAULTS.FORMAT,
    quality: DEFAULTS.QUALITY,
    rectColor: DEFAULTS.RECT_COLOR,
    rectStrokeWidth: DEFAULTS.RECT_STROKE_WIDTH,
    rectFillEnabled: DEFAULTS.RECT_FILL_ENABLED,
    stepColor: DEFAULTS.STEP_COLOR,
    stepRadius: DEFAULTS.STEP_RADIUS
  }
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0f1a',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a2e',
      symbolColor: '#e0e0e0',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // needed for sharp
    }
  })

  // Redirect renderer console messages to main process stdout/stderr
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelStr = ['DEBUG', 'INFO', 'WARN', 'ERROR'][level] || 'LOG'
    console.log(`[Renderer ${levelStr}] ${message} (at ${sourceId}:${line})`)
  })

  // Monitor renderer process crashes
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Main] Renderer process gone:', details)
  })

  mainWindow.webContents.on('unresponsive', () => {
    console.error('[Main] Renderer unresponsive')
  })

  // Check clipboard on focus (with small delay to allow OS to write clipboard data)
  mainWindow.on('focus', () => {
    setTimeout(() => {
      try {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) {
          const image = readClipboardImage()
          if (image) {
            mainWindow.webContents.send(IPC.CLIPBOARD_NEW_IMAGE, image)
          }
        }
      } catch (err) {
        console.error('[Main] Error during clipboard auto-check on focus:', err)
      }
    }, 150)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Intercept close and hide to tray instead
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  // Dev or production
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// Create System Tray
function createTray(): void {
  const iconPath = path.join(__dirname, '../../resources/icon.png')

  try {
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(icon)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Screentation',
        click: () => {
          mainWindow?.show()
          mainWindow?.focus()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])

    tray.setToolTip('Screentation')
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })

    tray.on('double-click', () => {
      mainWindow?.show()
      mainWindow?.focus()
    })
  } catch (err) {
    console.error('Failed to create tray icon:', err)
  }
}

// Register all IPC handlers
function registerAllHandlers(): void {
  registerClipboardHandlers()
  registerFileHandlers()
  registerImageHandlers()

  // Settings handlers
  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return store.store
  })

  ipcMain.handle(IPC.SETTINGS_SET, async (_event, settings: Partial<AppSettings>) => {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key as keyof AppSettings, value)
    }
  })
}

app.whenReady().then(() => {
  registerAllHandlers()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
