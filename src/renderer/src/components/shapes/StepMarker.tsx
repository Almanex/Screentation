import React from 'react'
import { Group, Circle, Text } from 'react-konva'
import type Konva from 'konva'

interface StepMarkerProps {
  id: string
  x: number
  y: number
  number: number
  color: string
  radius: number
  isSelected: boolean
  onSelect: () => void
  onChange: (attrs: { x: number; y: number }) => void
}

function darkenColor(hex: string, factor: number = 0.3): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * (1 - factor))
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * (1 - factor))
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * (1 - factor))
  return `rgb(${r}, ${g}, ${b})`
}

const StepMarker: React.FC<StepMarkerProps> = ({
  id,
  x,
  y,
  number,
  color,
  radius,
  isSelected,
  onSelect,
  onChange
}) => {
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>): void => {
    onChange({
      x: e.target.x(),
      y: e.target.y()
    })
  }

  const fontSize = Math.round(radius * 1.2)
  const strokeColor = isSelected ? '#fff' : darkenColor(color, 0.4)
  const strokeWidth = isSelected ? 2.5 : 1.5
  const shadowBlur = isSelected ? 12 : 6

  return (
    <Group
      x={x}
      y={y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
    >
      <Circle
        radius={radius}
        fill={color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        shadowColor="rgba(0,0,0,0.5)"
        shadowBlur={shadowBlur}
        shadowOffsetY={2}
      />
      <Text
        x={-radius}
        y={-radius}
        width={radius * 2}
        height={radius * 2}
        text={String(number)}
        fontSize={fontSize}
        fontStyle="bold"
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  )
}

export default StepMarker
