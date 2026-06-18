import { ipcMain } from 'electron'
import sharp from 'sharp'
import { IPC } from '../shared/constants'
import type { ImageFormat } from '../shared/types'

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64Data, 'base64')
}

export async function convertImage(
  dataUrl: string,
  format: ImageFormat,
  quality: number
): Promise<Buffer> {
  const buffer = dataUrlToBuffer(dataUrl)
  let pipeline = sharp(buffer)

  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality })
      break
    case 'webp':
      pipeline = pipeline.webp({ quality })
      break
    case 'png':
    default:
      pipeline = pipeline.png({ compressionLevel: 6 })
      break
  }

  return pipeline.toBuffer()
}

export function registerImageHandlers(): void {
  ipcMain.handle(
    'image:convert',
    async (_event, dataUrl: string, format: ImageFormat, quality: number) => {
      const buffer = await convertImage(dataUrl, format, quality)
      return buffer
    }
  )
}
