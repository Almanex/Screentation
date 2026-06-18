import React, { useRef, useEffect } from 'react'
import { Rect, Group, Line, Text, Transformer } from 'react-konva'
import type { EraserAnnotation } from '../../../../shared/types'
import type Konva from 'konva'

interface EraserRectProps {
  shapeProps: EraserAnnotation
  image: HTMLImageElement | undefined
  isSelected: boolean
  onSelect: () => void
  onChange: (attrs: Partial<EraserAnnotation>) => void
  onDelete: () => void
}

const EraserRect: React.FC<EraserRectProps> = ({
  shapeProps,
  image,
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
    if (e.target === shapeRef.current) {
      onChange({
        x: e.target.x(),
        y: e.target.y()
      })
    }
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

  const handleSourceDragEnd = (e: Konva.KonvaEventObject<DragEvent>): void => {
    e.cancelBubble = true
    onChange({
      offsetX: e.target.x() - shapeProps.x,
      offsetY: e.target.y() - shapeProps.y
    })
  }

  const handleKeyDown = (e: Konva.KonvaEventObject<KeyboardEvent>): void => {
    if (e.evt.key === 'Delete' || e.evt.key === 'Backspace') {
      onDelete()
    }
  }

  const sourceX = shapeProps.x + shapeProps.offsetX
  const sourceY = shapeProps.y + shapeProps.offsetY

  // Calculate centers for the connection line
  const destCenterX = shapeProps.x + shapeProps.width / 2
  const destCenterY = shapeProps.y + shapeProps.height / 2
  const sourceCenterX = sourceX + shapeProps.width / 2
  const sourceCenterY = sourceY + shapeProps.height / 2

  return (
    <>
      {/* Cloned image pattern (renders the cloned pixels) */}
      <Rect
        ref={shapeRef}
        x={shapeProps.x}
        y={shapeProps.y}
        width={shapeProps.width}
        height={shapeProps.height}
        fillPatternImage={image}
        fillPatternX={-sourceX}
        fillPatternY={-sourceY}
        fillPatternRepeat="no-repeat"
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        onKeyDown={handleKeyDown}
        stroke={isSelected ? '#2ecc71' : 'transparent'}
        strokeWidth={1}
        dash={isSelected ? [4, 4] : undefined}
      />

      {isSelected && (
        <>
          {/* Connection line */}
          <Line
            points={[destCenterX, destCenterY, sourceCenterX, sourceCenterY]}
            stroke="#2ecc71"
            strokeWidth={1.5}
            dash={[4, 4]}
            listening={false}
          />

          {/* Source area selector */}
          <Group
            x={sourceX}
            y={sourceY}
            draggable
            onDragEnd={handleSourceDragEnd}
          >
            <Rect
              width={shapeProps.width}
              height={shapeProps.height}
              stroke="#e74c3c"
              strokeWidth={1.5}
              dash={[4, 4]}
              fill="rgba(231, 76, 60, 0.1)"
            />
            <Text
              text="Source (Drag)"
              fontSize={10}
              fill="#e74c3c"
              x={5}
              y={5}
              align="left"
              listening={false}
            />
          </Group>

          {/* Label on destination */}
          <Text
            text="Eraser"
            fontSize={10}
            fill="#2ecc71"
            x={shapeProps.x + 5}
            y={shapeProps.y + 5}
            align="left"
            listening={false}
          />

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
            borderStroke="#2ecc71"
            anchorStroke="#2ecc71"
            anchorFill="#fff"
            anchorSize={8}
            anchorCornerRadius={2}
          />
        </>
      )}
    </>
  )
}

export default EraserRect
