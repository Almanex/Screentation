import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle
} from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Arrow } from 'react-konva'
import useImage from 'use-image'
import { v4 as uuidv4 } from 'uuid'
import type Konva from 'konva'
import type {
  Screenshot,
  ToolSettings,
  Annotation,
  RectAnnotation,
  StepAnnotation,
  ArrowAnnotation,
  BlurAnnotation,
  EraserAnnotation
} from '../../../shared/types'
import { useZoomToFit } from '../hooks/useZoomToFit'
import AnnotationRect from './shapes/AnnotationRect'
import StepMarker from './shapes/StepMarker'
import BlurRect from './shapes/BlurRect'
import EraserRect from './shapes/EraserRect'
import './Canvas.css'

interface CanvasProps {
  screenshot: Screenshot | null
  toolSettings: ToolSettings
  onAnnotationsChange: (annotations: Annotation[]) => void
  onSelectAnnotation: (id: string | null) => void
  selectedAnnotationId: string | null
}

export interface CanvasHandle {
  exportToDataUrl: () => string | null
}

interface DrawingRect {
  x: number
  y: number
  width: number
  height: number
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  (
    { screenshot, toolSettings, onAnnotationsChange, onSelectAnnotation, selectedAnnotationId },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<Konva.Stage>(null)
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
    const [drawingRect, setDrawingRect] = useState<DrawingRect | null>(null)
    const [drawingArrowPoints, setDrawingArrowPoints] = useState<number[] | null>(null)
    const isDrawing = useRef(false)

    const [image] = useImage(screenshot?.dataUrl ?? '')
    const imageWidth = screenshot?.width ?? 0
    const imageHeight = screenshot?.height ?? 0

    const { scale, offsetX, offsetY } = useZoomToFit(
      containerSize.width,
      containerSize.height,
      imageWidth,
      imageHeight
    )

    // Track container size with ResizeObserver
    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          setContainerSize({ width, height })
        }
      })

      observer.observe(container)
      // Also set initial size
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight
      })

      return () => observer.disconnect()
    }, [])

    // Convert screen coordinates to image space
    const screenToImage = useCallback(
      (pos: { x: number; y: number }): { x: number; y: number } => {
        const stage = stageRef.current
        if (!stage) return pos

        const transform = stage.getAbsoluteTransform().copy().invert()
        return transform.point(pos)
      },
      []
    )

    // Export at original resolution
    useImperativeHandle(
      ref,
      () => ({
        exportToDataUrl: (): string | null => {
          const stage = stageRef.current
          if (!stage || !screenshot) return null

          // Save current state
          const prevScale = { x: stage.scaleX(), y: stage.scaleY() }
          const prevPos = { x: stage.x(), y: stage.y() }

          // Set to original resolution
          stage.scaleX(1)
          stage.scaleY(1)
          stage.x(0)
          stage.y(0)

          const dataUrl = stage.toDataURL({
            x: 0,
            y: 0,
            width: screenshot.width,
            height: screenshot.height,
            pixelRatio: 1
          })

          // Restore
          stage.scaleX(prevScale.x)
          stage.scaleY(prevScale.y)
          stage.x(prevPos.x)
          stage.y(prevPos.y)

          return dataUrl
        }
      }),
      [screenshot]
    )

    // Mouse handlers for drawing
    const handleMouseDown = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!screenshot) return

        // Clicked on empty area
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'bg-image'

        if (toolSettings.activeTool === 'select') {
          if (clickedOnEmpty) {
            onSelectAnnotation(null)
          }
          return
        }

        if (toolSettings.activeTool === 'step') {
          if (clickedOnEmpty) {
            const stage = stageRef.current
            if (!stage) return

            const pointer = stage.getPointerPosition()
            if (!pointer) return

            const imagePos = screenToImage(pointer)

            const newStep: StepAnnotation = {
              id: uuidv4(),
              type: 'step',
              x: imagePos.x,
              y: imagePos.y,
              number: toolSettings.stepCounter,
              color: toolSettings.stepColor,
              radius: toolSettings.stepRadius
            }

            const newAnnotations = [...(screenshot.annotations || []), newStep]
            onAnnotationsChange(newAnnotations)
            onSelectAnnotation(null)
          }
          return
        }

        if (
          toolSettings.activeTool === 'rect' ||
          toolSettings.activeTool === 'blur' ||
          toolSettings.activeTool === 'eraser'
        ) {
          if (clickedOnEmpty) {
            onSelectAnnotation(null)
            const stage = stageRef.current
            if (!stage) return

            const pointer = stage.getPointerPosition()
            if (!pointer) return

            const imagePos = screenToImage(pointer)

            isDrawing.current = true
            setDrawingRect({
              x: imagePos.x,
              y: imagePos.y,
              width: 0,
              height: 0
            })
          }
        }

        if (toolSettings.activeTool === 'arrow') {
          if (clickedOnEmpty) {
            onSelectAnnotation(null)
            const stage = stageRef.current
            if (!stage) return

            const pointer = stage.getPointerPosition()
            if (!pointer) return

            const imagePos = screenToImage(pointer)

            isDrawing.current = true
            setDrawingArrowPoints([imagePos.x, imagePos.y, imagePos.x, imagePos.y])
          }
        }
      },
      [screenshot, toolSettings, onAnnotationsChange, onSelectAnnotation, screenToImage]
    )

    const handleMouseMove = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isDrawing.current) return

        const stage = stageRef.current
        if (!stage) return

        const pointer = stage.getPointerPosition()
        if (!pointer) return

        const imagePos = screenToImage(pointer)

        if (drawingRect) {
          setDrawingRect({
            ...drawingRect,
            width: imagePos.x - drawingRect.x,
            height: imagePos.y - drawingRect.y
          })
        } else if (drawingArrowPoints) {
          setDrawingArrowPoints([
            drawingArrowPoints[0],
            drawingArrowPoints[1],
            imagePos.x,
            imagePos.y
          ])
        }
      },
      [drawingRect, drawingArrowPoints, screenToImage]
    )

    const handleMouseUp = useCallback(() => {
      if (!isDrawing.current || !screenshot) return

      isDrawing.current = false

      if (drawingRect) {
        let { x, y, width, height } = drawingRect
        if (width < 0) {
          x = x + width
          width = -width
        }
        if (height < 0) {
          y = y + height
          height = -height
        }

        if (width >= 5 && height >= 5) {
          if (toolSettings.activeTool === 'rect') {
            const newRect: RectAnnotation = {
              id: uuidv4(),
              type: 'rect',
              x,
              y,
              width,
              height,
              strokeColor: toolSettings.rectColor,
              strokeWidth: toolSettings.rectStrokeWidth,
              fillEnabled: toolSettings.rectFillEnabled
            }
            const newAnnotations = [...(screenshot.annotations || []), newRect]
            onAnnotationsChange(newAnnotations)
          } else if (toolSettings.activeTool === 'blur') {
            const newBlur: BlurAnnotation = {
              id: uuidv4(),
              type: 'blur',
              x,
              y,
              width,
              height,
              blurRadius: 35
            }
            const newAnnotations = [...(screenshot.annotations || []), newBlur]
            onAnnotationsChange(newAnnotations)
          } else if (toolSettings.activeTool === 'eraser') {
            const newEraser: EraserAnnotation = {
              id: uuidv4(),
              type: 'eraser',
              x,
              y,
              width,
              height,
              offsetX: width + 20,
              offsetY: 0
            }
            const newAnnotations = [...(screenshot.annotations || []), newEraser]
            onAnnotationsChange(newAnnotations)
          }
        }
        setDrawingRect(null)
      } else if (drawingArrowPoints) {
        const dx = drawingArrowPoints[2] - drawingArrowPoints[0]
        const dy = drawingArrowPoints[3] - drawingArrowPoints[1]
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist >= 5) {
          const newArrow: ArrowAnnotation = {
            id: uuidv4(),
            type: 'arrow',
            points: drawingArrowPoints,
            color: toolSettings.rectColor,
            strokeWidth: toolSettings.rectStrokeWidth
          }
          const newAnnotations = [...(screenshot.annotations || []), newArrow]
          onAnnotationsChange(newAnnotations)
        }
        setDrawingArrowPoints(null)
      }
    }, [drawingRect, drawingArrowPoints, screenshot, toolSettings, onAnnotationsChange])

    // Update an annotation by id
    const handleAnnotationChange = useCallback(
      (id: string, changes: Partial<Annotation>) => {
        if (!screenshot) return
        const newAnnotations = screenshot.annotations.map((ann) =>
          ann.id === id ? { ...ann, ...changes } : ann
        )
        onAnnotationsChange(newAnnotations)
      },
      [screenshot, onAnnotationsChange]
    )

    // Delete an annotation by id
    const handleAnnotationDelete = useCallback(
      (id: string) => {
        if (!screenshot) return
        const newAnnotations = screenshot.annotations.filter((ann) => ann.id !== id)
        onAnnotationsChange(newAnnotations)
        if (selectedAnnotationId === id) {
          onSelectAnnotation(null)
        }
      },
      [screenshot, onAnnotationsChange, selectedAnnotationId, onSelectAnnotation]
    )

    // Cursor based on active tool
    const getCursor = (): string => {
      if (!screenshot) return 'default'
      switch (toolSettings.activeTool) {
        case 'rect':
        case 'arrow':
        case 'blur':
        case 'eraser':
          return 'crosshair'
        case 'step':
          return 'pointer'
        default:
          return 'default'
      }
    }

    if (!screenshot) {
      return (
        <div className="canvas-container" ref={containerRef}>
          <div className="canvas-empty-state">
            <div className="icon">📋</div>
            <div className="title">No screenshots yet</div>
            <div className="subtitle">Paste from clipboard (Ctrl+V) or drag &amp; drop an image</div>
          </div>
        </div>
      )
    }

    return (
      <div
        className="canvas-container"
        ref={containerRef}
        style={{ cursor: getCursor() }}
      >
        <Stage
          ref={stageRef}
          width={containerSize.width || 1}
          height={containerSize.height || 1}
          scaleX={scale}
          scaleY={scale}
          x={offsetX}
          y={offsetY}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            {/* Background image */}
            {image && (
              <KonvaImage
                image={image}
                width={imageWidth}
                height={imageHeight}
                name="bg-image"
                listening={true}
              />
            )}

            {/* Annotations */}
            {screenshot.annotations.map((ann) => {
              if (ann.type === 'rect') {
                return (
                  <AnnotationRect
                    key={ann.id}
                    shapeProps={ann}
                    isSelected={selectedAnnotationId === ann.id}
                    onSelect={() => onSelectAnnotation(ann.id)}
                    onChange={(changes) => handleAnnotationChange(ann.id, changes)}
                    onDelete={() => handleAnnotationDelete(ann.id)}
                  />
                )
              }
              if (ann.type === 'step') {
                return (
                  <StepMarker
                    key={ann.id}
                    id={ann.id}
                    x={ann.x}
                    y={ann.y}
                    number={ann.number}
                    color={ann.color}
                    radius={ann.radius}
                    isSelected={selectedAnnotationId === ann.id}
                    onSelect={() => onSelectAnnotation(ann.id)}
                    onChange={(changes) => handleAnnotationChange(ann.id, changes)}
                  />
                )
              }
              if (ann.type === 'arrow') {
                return (
                  <Arrow
                    key={ann.id}
                    points={ann.points}
                    stroke={ann.color}
                    fill={ann.color}
                    strokeWidth={ann.strokeWidth}
                    pointerLength={10}
                    pointerWidth={10}
                    draggable={toolSettings.activeTool === 'select'}
                    onClick={() => onSelectAnnotation(ann.id)}
                    onTap={() => onSelectAnnotation(ann.id)}
                    onDragEnd={(e) => {
                      const dx = e.target.x()
                      const dy = e.target.y()
                      e.target.x(0)
                      e.target.y(0)
                      const newPoints = [
                        ann.points[0] + dx,
                        ann.points[1] + dy,
                        ann.points[2] + dx,
                        ann.points[3] + dy
                      ]
                      handleAnnotationChange(ann.id, { points: newPoints })
                    }}
                  />
                )
              }
              if (ann.type === 'blur') {
                return (
                  <BlurRect
                    key={ann.id}
                    shapeProps={ann}
                    image={image}
                    isSelected={selectedAnnotationId === ann.id}
                    onSelect={() => onSelectAnnotation(ann.id)}
                    onChange={(changes) => handleAnnotationChange(ann.id, changes)}
                  />
                )
              }
              if (ann.type === 'eraser') {
                return (
                  <EraserRect
                    key={ann.id}
                    shapeProps={ann}
                    image={image}
                    isSelected={selectedAnnotationId === ann.id}
                    onSelect={() => onSelectAnnotation(ann.id)}
                    onChange={(changes) => handleAnnotationChange(ann.id, changes)}
                    onDelete={() => handleAnnotationDelete(ann.id)}
                  />
                )
              }
              return null
            })}

            {/* Drawing preview rect / blur */}
            {drawingRect && (
              <Rect
                x={drawingRect.x}
                y={drawingRect.y}
                width={drawingRect.width}
                height={drawingRect.height}
                stroke={toolSettings.rectColor}
                strokeWidth={toolSettings.rectStrokeWidth}
                dash={[6, 3]}
                listening={false}
              />
            )}

            {/* Drawing preview arrow */}
            {drawingArrowPoints && (
              <Arrow
                points={drawingArrowPoints}
                stroke={toolSettings.rectColor}
                fill={toolSettings.rectColor}
                strokeWidth={toolSettings.rectStrokeWidth}
                pointerLength={10}
                pointerWidth={10}
                dash={[6, 3]}
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      </div>
    )
  }
)

Canvas.displayName = 'Canvas'

export default Canvas
