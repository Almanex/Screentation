import { useMemo } from 'react'

interface ZoomToFitResult {
  scale: number
  offsetX: number
  offsetY: number
}

export function useZoomToFit(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  padding: number = 20
): ZoomToFitResult {
  return useMemo(() => {
    if (containerWidth <= 0 || containerHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
      return { scale: 1, offsetX: 0, offsetY: 0 }
    }

    const availableW = containerWidth - padding * 2
    const availableH = containerHeight - padding * 2

    // Never upscale — cap at 1
    const scale = Math.min(availableW / imageWidth, availableH / imageHeight, 1)

    const scaledW = imageWidth * scale
    const scaledH = imageHeight * scale

    const offsetX = (containerWidth - scaledW) / 2
    const offsetY = (containerHeight - scaledH) / 2

    return { scale, offsetX, offsetY }
  }, [containerWidth, containerHeight, imageWidth, imageHeight, padding])
}
