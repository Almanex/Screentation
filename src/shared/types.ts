// ============================
// Annotation types
// ============================

export interface RectAnnotation {
  id: string
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  strokeColor: string
  strokeWidth: number
  fillEnabled?: boolean
}

export interface StepAnnotation {
  id: string
  type: 'step'
  x: number
  y: number
  number: number
  color: string
  radius: number
}

export interface ArrowAnnotation {
  id: string
  type: 'arrow'
  points: number[] // [startX, startY, endX, endY]
  color: string
  strokeWidth: number
}

export interface BlurAnnotation {
  id: string
  type: 'blur'
  x: number
  y: number
  width: number
  height: number
  blurRadius: number
}

export type Annotation = RectAnnotation | StepAnnotation | ArrowAnnotation | BlurAnnotation

// ============================
// Screenshot
// ============================

export interface Screenshot {
  id: string
  dataUrl: string
  width: number
  height: number
  annotations: Annotation[]
}

// ============================
// Clipboard
// ============================

export interface ClipboardImage {
  dataUrl: string
  width: number
  height: number
}

// ============================
// Export
// ============================

export type ImageFormat = 'png' | 'jpeg' | 'webp'

export interface ExportSettings {
  outputDir: string
  fileNameTemplate: string
  format: ImageFormat
  quality: number
}

export interface SaveImageParams {
  dataUrl: string
  fileName: string
  format: ImageFormat
  quality: number
  outputDir: string
}

export interface SaveAllParams {
  images: Array<{
    dataUrl: string
    index: number
  }>
  fileNameTemplate: string
  format: ImageFormat
  quality: number
  outputDir: string
}

// ============================
// Tool settings
// ============================

export type ToolType = 'select' | 'rect' | 'step' | 'arrow' | 'blur'

export interface ToolSettings {
  activeTool: ToolType
  rectColor: string
  rectStrokeWidth: number
  rectFillEnabled: boolean
  stepColor: string
  stepRadius: number
  stepCounter: number
}

// ============================
// App settings (persisted)
// ============================

export interface AppSettings {
  outputDir: string
  fileNameTemplate: string
  format: ImageFormat
  quality: number
  rectColor: string
  rectStrokeWidth: number
  rectFillEnabled: boolean
  stepColor: string
  stepRadius: number
}
