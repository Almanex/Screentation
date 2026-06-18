import { useEffect } from 'react'

type OnNewImage = (dataUrl: string, width: number, height: number) => void

export function useClipboard(onNewImage: OnNewImage): void {
  useEffect(() => {
    // Handle Ctrl+V paste
    const handlePaste = async (e: KeyboardEvent): Promise<void> => {
      if (e.ctrlKey && (e.key === 'v' || e.code === 'KeyV')) {
        // Don't intercept if typing in an input
        const target = e.target as HTMLElement
        const tag = target.tagName.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return

        e.preventDefault()
        try {
          const result = await window.electronAPI.readClipboardImage()
          if (result) {
            onNewImage(result.dataUrl, result.width, result.height)
          }
        } catch (err) {
          console.error('Failed to read clipboard image:', err)
        }
      }
    }

    // Handle focus-based paste from main process
    const cleanupFocusPaste = window.electronAPI.onNewClipboardImage((image) => {
      onNewImage(image.dataUrl, image.width, image.height)
    })

    // Handle drag-and-drop of image files
    const handleDragOver = (e: DragEvent): void => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: DragEvent): void => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) continue

        const reader = new FileReader()
        reader.onload = (): void => {
          const dataUrl = reader.result as string
          const img = new Image()
          img.onload = (): void => {
            onNewImage(dataUrl, img.width, img.height)
          }
          img.src = dataUrl
        }
        reader.readAsDataURL(file)
      }
    }

    window.addEventListener('keydown', handlePaste)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('keydown', handlePaste)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
      cleanupFocusPaste()
    }
  }, [onNewImage])
}
