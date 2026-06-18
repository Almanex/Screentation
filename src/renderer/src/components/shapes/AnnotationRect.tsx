import React, { useRef, useEffect } from 'react'
import { Rect, Transformer } from 'react-konva'
import type { RectAnnotation } from '../../../../shared/types'
import type Konva from 'konva'

interface AnnotationRectProps {
  shapeProps: RectAnnotation
  isSelected: boolean
  onSelect: () => void
  onChange: (attrs: Partial<RectAnnotation>) => void
  onDelete: () => void
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const AnnotationRect: React.FC<AnnotationRectProps> = ({
  shapeProps,
  isSelected,
  onSelect,
  onChange,
  onDelete
}) => {
  const shapeRef = useRef<Konva.Rect>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

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

    // Reset scale to 1 and apply it to width/height
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

  const handleKeyDown = (e: Konva.KonvaEventObject<KeyboardEvent>): void => {
    if (e.evt.key === 'Delete' || e.evt.key === 'Backspace') {
      onDelete()
    }
  }

  return (
    <>
      <Rect
        ref={shapeRef}
        x={shapeProps.x}
        y={shapeProps.y}
        width={shapeProps.width}
        height={shapeProps.height}
        stroke={shapeProps.strokeColor}
        strokeWidth={shapeProps.strokeWidth}
        fill={shapeProps.fillEnabled !== false ? hexToRgba(shapeProps.strokeColor, 0.08) : 'rgba(0,0,0,0)'}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        onKeyDown={handleKeyDown}
        cornerRadius={2}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          flipEnabled={false}
          boundBoxFunc={(_oldBox, newBox) => {
            // Enforce minimum size
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
              return _oldBox
            }
            return newBox
          }}
          borderStroke={shapeProps.strokeColor}
          anchorStroke={shapeProps.strokeColor}
          anchorFill="#fff"
          anchorSize={8}
          anchorCornerRadius={2}
        />
      )}
    </>
  )
}

export default AnnotationRect
