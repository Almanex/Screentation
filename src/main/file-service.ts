import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { IPC } from '../shared/constants'
import { convertImage } from './image-service'
import type { SaveImageParams, SaveAllParams, ImageFormat } from '../shared/types'

function resolveFileName(template: string, index: number): string {
  const padded = String(index).padStart(2, '0')
  return template.replace(/\[N\]/gi, padded)
}

function getExtension(format: ImageFormat): string {
  switch (format) {
    case 'jpeg':
      return '.jpg'
    case 'webp':
      return '.webp'
    case 'png':
    default:
      return '.png'
  }
}

export function registerFileHandlers(): void {
  // Select folder dialog
  ipcMain.handle(IPC.DIALOG_SELECT_FOLDER, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const originalCwd = process.cwd()

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Output Folder'
    })

    try {
      process.chdir(originalCwd)
    } catch (err) {
      console.error('[Main] Failed to restore process CWD:', err)
    }

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Save single image
  ipcMain.handle(
    IPC.FILE_SAVE_IMAGE,
    async (_event, params: SaveImageParams): Promise<string> => {
      const { dataUrl, fileName, format, quality, outputDir } = params
      const buffer = await convertImage(dataUrl, format, quality)
      const ext = getExtension(format)
      const filePath = path.join(outputDir, `${fileName}${ext}`)

      await fs.mkdir(outputDir, { recursive: true })
      await fs.writeFile(filePath, buffer)

      return filePath
    }
  )

  // Save all images (batch)
  ipcMain.handle(
    IPC.FILE_SAVE_ALL,
    async (_event, params: SaveAllParams): Promise<string[]> => {
      const { images, fileNameTemplate, format, quality, outputDir } = params

      await fs.mkdir(outputDir, { recursive: true })

      const savedPaths: string[] = []

      for (const img of images) {
        const fileName = resolveFileName(fileNameTemplate, img.index)
        const ext = getExtension(format)
        const filePath = path.join(outputDir, `${fileName}${ext}`)

        const buffer = await convertImage(img.dataUrl, format, quality)
        await fs.writeFile(filePath, buffer)
        savedPaths.push(filePath)
      }

      return savedPaths
    }
  )
}
