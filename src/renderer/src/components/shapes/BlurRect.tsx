import React, { useRef, useEffect } from 'react'
import { Rect, Transformer } from 'react-konva'
import type { BlurAnnotation } from '../../../../shared/types'
import Konva from 'konva'

interface BlurRectProps {
  shapeProps: BlurAnnotation
  image: HTMLImageElement | undefined
  isSelected: boolean
  onSelect: () => void
  onChange: (attrs: Partial<BlurAnnotation>) => void
}

const BlurRect: React.FC<BlurRectProps> = ({
  shapeProps,
  image,
  isSelected,
  onSelect,
  onChange
}) => {
  const shapeRef = useRef<Konva.Rect>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  // Recache when shape dimensions, position or image changes
  useEffect(() => {
    const node = shapeRef.current
    if (node) {
      // We must clear cache first, then cache again to update the blurred image crop
      node.clearCache()
      try {
        node.cache()
      } catch (err) {
        console.warn('Konva cache failed:', err)
      }
      node.getLayer()?.batchDraw()
    }
  }, [shapeProps.x, shapeProps.y, shapeProps.width, shapeProps.height, image])

  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>): void => {
    onChange({
      x: e.target.x(),
      y: e.target.y()
    })
  }

  const handleTransformEnd = (): void => {
    const node = shapeRef.current
    if (!node) return

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    node.scaleX(1)
    node.scaleY(1)

    const newWidth = Math.max(10, node.width() * scaleX)
    const newHeight = Math.max(10, node.height() * scaleY)

    onChange({
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight
    })
  }

  return (
    <>
      <Rect
        ref={shapeRef}
        x={shapeProps.x}
        y={shapeProps.y}
        width={shapeProps.width}
        height={shapeProps.height}
        fillPatternImage={image}
        fillPatternX={-shapeProps.x}
        fillPatternY={-shapeProps.y}
        fillPatternRepeat="no-repeat"
        filters={[Konva.Filters.Blur]}
        blurRadius={shapeProps.blurRadius}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          boundBoxFunc={(_oldBox, newBox) => {
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
              return _oldBox
            }
            return newBox
          }}
          borderStroke="#6c5ce7"
          anchorStroke="#6c5ce7"
          anchorFill="#fff"
          anchorSize={8}
          anchorCornerRadius={2}
        />
      )}
    </>
  )
}

export default BlurRect
