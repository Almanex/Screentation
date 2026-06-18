import React, { createContext, useContext, useReducer } from 'react'
import type {
  Screenshot,
  ToolSettings,
  ExportSettings,
  Annotation
} from '../../../shared/types'
import { DEFAULTS } from '../../../shared/constants'

// ============================
// State
// ============================

export interface AppState {
  screenshots: Screenshot[]
  activeScreenshotId: string | null
  toolSettings: ToolSettings
  exportSettings: ExportSettings
  selectedAnnotationId: string | null
}

const initialState: AppState = {
  screenshots: [],
  activeScreenshotId: null,
  toolSettings: {
    activeTool: 'rect',
    rectColor: DEFAULTS.RECT_COLOR,
    rectStrokeWidth: DEFAULTS.RECT_STROKE_WIDTH,
    rectFillEnabled: DEFAULTS.RECT_FILL_ENABLED,
    stepColor: DEFAULTS.STEP_COLOR,
    stepRadius: DEFAULTS.STEP_RADIUS,
    stepCounter: DEFAULTS.STEP_COUNTER
  },
  exportSettings: {
    outputDir: '',
    fileNameTemplate: DEFAULTS.FILE_NAME_TEMPLATE,
    format: DEFAULTS.FORMAT,
    quality: DEFAULTS.QUALITY
  },
  selectedAnnotationId: null
}

// ============================
// Actions
// ============================

type AppAction =
  | { type: 'ADD_SCREENSHOT'; payload: Screenshot }
  | { type: 'REMOVE_SCREENSHOT'; payload: string }
  | { type: 'SET_ACTIVE_SCREENSHOT'; payload: string | null }
  | { type: 'UPDATE_ANNOTATIONS'; payload: { screenshotId: string; annotations: Annotation[] } }
  | { type: 'SET_TOOL_SETTINGS'; payload: Partial<ToolSettings> }
  | { type: 'SET_EXPORT_SETTINGS'; payload: Partial<ExportSettings> }
  | { type: 'SET_SELECTED_ANNOTATION'; payload: string | null }

// ============================
// Reducer
// ============================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_SCREENSHOT': {
      const newScreenshots = [...state.screenshots, action.payload]
      return {
        ...state,
        screenshots: newScreenshots,
        activeScreenshotId: action.payload.id,
        selectedAnnotationId: null
      }
    }

    case 'REMOVE_SCREENSHOT': {
      const id = action.payload
      const idx = state.screenshots.findIndex((s) => s.id === id)
      const newScreenshots = state.screenshots.filter((s) => s.id !== id)

      let newActiveId = state.activeScreenshotId
      if (state.activeScreenshotId === id) {
        if (newScreenshots.length === 0) {
          newActiveId = null
        } else if (idx >= newScreenshots.length) {
          newActiveId = newScreenshots[newScreenshots.length - 1].id
        } else {
          newActiveId = newScreenshots[idx].id
        }
      }

      return {
        ...state,
        screenshots: newScreenshots,
        activeScreenshotId: newActiveId,
        selectedAnnotationId:
          state.activeScreenshotId === id ? null : state.selectedAnnotationId
      }
    }

    case 'SET_ACTIVE_SCREENSHOT':
      return {
        ...state,
        activeScreenshotId: action.payload,
        selectedAnnotationId: null
      }

    case 'UPDATE_ANNOTATIONS': {
      const { screenshotId, annotations } = action.payload
      return {
        ...state,
        screenshots: state.screenshots.map((s) =>
          s.id === screenshotId ? { ...s, annotations } : s
        )
      }
    }

    case 'SET_TOOL_SETTINGS':
      return {
        ...state,
        toolSettings: { ...state.toolSettings, ...action.payload }
      }

    case 'SET_EXPORT_SETTINGS':
      return {
        ...state,
        exportSettings: { ...state.exportSettings, ...action.payload }
      }

    case 'SET_SELECTED_ANNOTATION':
      return {
        ...state,
        selectedAnnotationId: action.payload
      }

    default:
      return state
  }
}

// ============================
// Context
// ============================

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextValue | null>(null)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return ctx
}

export type { AppAction }
