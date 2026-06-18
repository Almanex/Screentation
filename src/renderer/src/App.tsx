import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { AppProvider, useApp } from './store/useAppStore'
import { useClipboard } from './hooks/useClipboard'
import { useHotkeys, type HotkeyMap } from './hooks/useHotkeys'
import { useHistory } from './hooks/useHistory'
import Canvas, { type CanvasHandle } from './components/Canvas'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import ExportPanel from './components/ExportPanel'
import type { Annotation, ExportSettings, ToolSettings } from '../../shared/types'
import { DEFAULTS } from '../../shared/constants'

// ============================
// History state per screenshot
// ============================

interface ScreenshotHistory {
  stack: Annotation[][]
  pointer: number
}

// ============================
// Inner App (inside provider)
// ============================

const AppInner: React.FC = () => {
  const { state, dispatch } = useApp()
  const canvasRefs = useRef<Map<string, CanvasHandle>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const [statusText, setStatusText] = useState('')

  // Per-screenshot history stored in a ref
  const historyMapRef = useRef<Map<string, ScreenshotHistory>>(new Map())

  // Get history for current screenshot
  const getHistory = useCallback(
    (id: string): ScreenshotHistory => {
      if (!historyMapRef.current.has(id)) {
        const ss = state.screenshots.find((s) => s.id === id)
        historyMapRef.current.set(id, {
          stack: [ss?.annotations ?? []],
          pointer: 0
        })
      }
      return historyMapRef.current.get(id)!
    },
    [state.screenshots]
  )

  // Active screenshot
  const activeScreenshot = useMemo(
    () => state.screenshots.find((s) => s.id === state.activeScreenshotId) ?? null,
    [state.screenshots, state.activeScreenshotId]
  )

  // Compute canUndo/canRedo for active screenshot
  const activeHistory = state.activeScreenshotId
    ? getHistory(state.activeScreenshotId)
    : null
  const canUndo = activeHistory ? activeHistory.pointer > 0 : false
  const canRedo = activeHistory
    ? activeHistory.pointer < activeHistory.stack.length - 1
    : false

  // Push to history for current screenshot
  const pushHistory = useCallback(
    (annotations: Annotation[]) => {
      if (!state.activeScreenshotId) return
      const h = getHistory(state.activeScreenshotId)

      // Discard future
      h.stack = h.stack.slice(0, h.pointer + 1)
      h.stack.push(annotations)

      // Max 50
      if (h.stack.length > 50) {
        h.stack.shift()
      }
      h.pointer = h.stack.length - 1
    },
    [state.activeScreenshotId, getHistory]
  )

  // Undo
  const handleUndo = useCallback(() => {
    if (!state.activeScreenshotId) return
    const h = getHistory(state.activeScreenshotId)
    if (h.pointer > 0) {
      h.pointer--
      dispatch({
        type: 'UPDATE_ANNOTATIONS',
        payload: {
          screenshotId: state.activeScreenshotId,
          annotations: h.stack[h.pointer]
        }
      })
    }
  }, [state.activeScreenshotId, getHistory, dispatch])

  // Redo
  const handleRedo = useCallback(() => {
    if (!state.activeScreenshotId) return
    const h = getHistory(state.activeScreenshotId)
    if (h.pointer < h.stack.length - 1) {
      h.pointer++
      dispatch({
        type: 'UPDATE_ANNOTATIONS',
        payload: {
          screenshotId: state.activeScreenshotId,
          annotations: h.stack[h.pointer]
        }
      })
    }
  }, [state.activeScreenshotId, getHistory, dispatch])

  // Handle annotations change from canvas
  const handleAnnotationsChange = useCallback(
    (annotations: Annotation[]) => {
      if (!state.activeScreenshotId) return

      // Check if a step was added — auto-increment counter
      const oldAnnotations = activeScreenshot?.annotations ?? []
      const newSteps = annotations.filter((a) => a.type === 'step')
      const oldSteps = oldAnnotations.filter((a) => a.type === 'step')
      if (newSteps.length > oldSteps.length) {
        // A new step was added — increment counter
        dispatch({
          type: 'SET_TOOL_SETTINGS',
          payload: { stepCounter: state.toolSettings.stepCounter + 1 }
        })
      }

      dispatch({
        type: 'UPDATE_ANNOTATIONS',
        payload: { screenshotId: state.activeScreenshotId, annotations }
      })

      pushHistory(annotations)
    },
    [state.activeScreenshotId, state.toolSettings.stepCounter, activeScreenshot, dispatch, pushHistory]
  )

  // Clipboard handler
  const handleNewImage = useCallback(
    (dataUrl: string, width: number, height: number) => {
      const id = uuidv4()
      dispatch({
        type: 'ADD_SCREENSHOT',
        payload: { id, dataUrl, width, height, annotations: [] }
      })
    },
    [dispatch]
  )

  useClipboard(handleNewImage)

  // Manual paste from button
  const handleForcePaste = useCallback(async () => {
    try {
      const result = await window.electronAPI.readClipboardImage()
      if (result) {
        handleNewImage(result.dataUrl, result.width, result.height)
        setStatusText('✓ Image pasted from clipboard')
      } else {
        setStatusText('⚠ No image found in clipboard')
      }
    } catch (err) {
      console.error('Manual paste failed:', err)
      setStatusText('✗ Paste failed')
    }
  }, [handleNewImage])

  // Delete selected annotation
  const handleDeleteSelected = useCallback(() => {
    if (!state.selectedAnnotationId || !activeScreenshot) return
    const newAnnotations = activeScreenshot.annotations.filter(
      (a) => a.id !== state.selectedAnnotationId
    )
    handleAnnotationsChange(newAnnotations)
    dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: null })
  }, [state.selectedAnnotationId, activeScreenshot, handleAnnotationsChange, dispatch])

  // Save current screenshot
  const handleSaveCurrent = useCallback(async () => {
    if (!activeScreenshot) return
    const activeCanvas = canvasRefs.current.get(activeScreenshot.id)
    if (!activeCanvas) return
    if (!state.exportSettings.outputDir) {
      setStatusText('⚠ Please select an output folder first')
      return
    }

    setIsSaving(true)
    try {
      const dataUrl = activeCanvas.exportToDataUrl()
      if (!dataUrl) throw new Error('Failed to export')

      const index = state.screenshots.findIndex((s) => s.id === activeScreenshot.id)
      const fileName = state.exportSettings.fileNameTemplate.replace(
        '[N]',
        String(index + 1).padStart(2, '0')
      )

      const result = await window.electronAPI.saveImage({
        dataUrl,
        fileName,
        format: state.exportSettings.format,
        quality: state.exportSettings.quality,
        outputDir: state.exportSettings.outputDir
      })

      setStatusText(`✓ Saved: ${result}`)
    } catch (err) {
      console.error('Save failed:', err)
      setStatusText(`✗ Save failed: ${err}`)
    } finally {
      setIsSaving(false)
    }
  }, [activeScreenshot, state.exportSettings, state.screenshots])

  // Save all screenshots
  const handleSaveAll = useCallback(async () => {
    if (state.screenshots.length === 0) return
    if (!state.exportSettings.outputDir) {
      setStatusText('⚠ Please select an output folder first')
      return
    }

    setIsSaving(true)
    try {
      const images: Array<{ dataUrl: string; index: number }> = []

      for (let i = 0; i < state.screenshots.length; i++) {
        const ss = state.screenshots[i]
        const ref = canvasRefs.current.get(ss.id)
        const dataUrl = ref ? ref.exportToDataUrl() : null
        images.push({
          dataUrl: dataUrl || ss.dataUrl,
          index: i
        })
      }

      // Sort by index
      images.sort((a, b) => a.index - b.index)

      const results = await window.electronAPI.saveAllImages({
        images,
        fileNameTemplate: state.exportSettings.fileNameTemplate,
        format: state.exportSettings.format,
        quality: state.exportSettings.quality,
        outputDir: state.exportSettings.outputDir
      })

      setStatusText(`✓ Saved ${results.length} files to ${state.exportSettings.outputDir}`)
    } catch (err) {
      console.error('Save all failed:', err)
      setStatusText(`✗ Save all failed: ${err}`)
    } finally {
      setIsSaving(false)
    }
  }, [state.screenshots, state.exportSettings])

  // Hotkeys
  const hotkeyMap = useMemo<HotkeyMap>(
    () => ({
      'Ctrl+z': () => handleUndo(),
      'Ctrl+y': () => handleRedo(),
      'Ctrl+s': () => handleSaveCurrent(),
      'Ctrl+Shift+s': () => handleSaveAll(),
      '1': () =>
        dispatch({ type: 'SET_TOOL_SETTINGS', payload: { activeTool: 'rect' } }),
      '2': () =>
        dispatch({ type: 'SET_TOOL_SETTINGS', payload: { activeTool: 'step' } }),
      '3': () =>
        dispatch({ type: 'SET_TOOL_SETTINGS', payload: { activeTool: 'arrow' } }),
      '4': () =>
        dispatch({ type: 'SET_TOOL_SETTINGS', payload: { activeTool: 'blur' } }),
      '5': () =>
        dispatch({ type: 'SET_TOOL_SETTINGS', payload: { activeTool: 'eraser' } }),
      'Escape': () => {
        dispatch({ type: 'SET_TOOL_SETTINGS', payload: { activeTool: 'select' } })
        dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: null })
      },
      'Delete': () => handleDeleteSelected(),
      'Backspace': () => handleDeleteSelected()
    }),
    [handleUndo, handleRedo, handleSaveCurrent, handleSaveAll, handleDeleteSelected, dispatch]
  )

  useHotkeys(hotkeyMap)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      try {
        const settings = await window.electronAPI.getSettings()
        dispatch({
          type: 'SET_EXPORT_SETTINGS',
          payload: {
            outputDir: settings.outputDir || '',
            fileNameTemplate: settings.fileNameTemplate || DEFAULTS.FILE_NAME_TEMPLATE,
            format: settings.format || DEFAULTS.FORMAT,
            quality: settings.quality || DEFAULTS.QUALITY
          }
        })
        dispatch({
          type: 'SET_TOOL_SETTINGS',
          payload: {
            rectColor: settings.rectColor || DEFAULTS.RECT_COLOR,
            rectStrokeWidth: settings.rectStrokeWidth || DEFAULTS.RECT_STROKE_WIDTH,
            rectFillEnabled: settings.rectFillEnabled !== undefined ? settings.rectFillEnabled : DEFAULTS.RECT_FILL_ENABLED,
            stepColor: settings.stepColor || DEFAULTS.STEP_COLOR,
            stepRadius: settings.stepRadius || DEFAULTS.STEP_RADIUS
          }
        })
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }

    loadSettings()
  }, [dispatch])

  // Persist export settings changes
  const handleExportSettingsChange = useCallback(
    (changes: Partial<ExportSettings>) => {
      dispatch({ type: 'SET_EXPORT_SETTINGS', payload: changes })
      // Save to persistent storage
      window.electronAPI.setSettings(changes).catch(console.error)
    },
    [dispatch]
  )

  // Persist tool settings changes
  const handleToolSettingsChange = useCallback(
    (changes: Partial<ToolSettings>) => {
      dispatch({ type: 'SET_TOOL_SETTINGS', payload: changes })
      // Persist only non-transient settings
      const persistable: Record<string, unknown> = {}
      if ('rectColor' in changes) persistable.rectColor = changes.rectColor
      if ('rectStrokeWidth' in changes) persistable.rectStrokeWidth = changes.rectStrokeWidth
      if ('rectFillEnabled' in changes) persistable.rectFillEnabled = changes.rectFillEnabled
      if ('stepColor' in changes) persistable.stepColor = changes.stepColor
      if ('stepRadius' in changes) persistable.stepRadius = changes.stepRadius
      if (Object.keys(persistable).length > 0) {
        window.electronAPI.setSettings(persistable as any).catch(console.error)
      }
    },
    [dispatch]
  )

  // Reset step counter
  const handleResetCounter = useCallback(() => {
    dispatch({ type: 'SET_TOOL_SETTINGS', payload: { stepCounter: 1 } })
  }, [dispatch])

  // Delete screenshot
  const handleDeleteScreenshot = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_SCREENSHOT', payload: id })
      // Clean up history and refs
      historyMapRef.current.delete(id)
      canvasRefs.current.delete(id)
    },
    [dispatch]
  )

  // Select screenshot
  const handleSelectScreenshot = useCallback(
    (id: string) => {
      dispatch({ type: 'SET_ACTIVE_SCREENSHOT', payload: id })
    },
    [dispatch]
  )

  return (
    <div className="app-layout">
      {/* Title bar area (Windows overlay) */}
      <div className="titlebar-area" />

      <div className="app-main">
        {/* Left: Sidebar */}
        <Sidebar
          screenshots={state.screenshots}
          activeId={state.activeScreenshotId}
          onSelect={handleSelectScreenshot}
          onDelete={handleDeleteScreenshot}
          onPaste={handleForcePaste}
        />

        {/* Center: Canvas(es) */}
        {state.screenshots.map((ss) => {
          const isActive = ss.id === state.activeScreenshotId
          return (
            <div
              key={ss.id}
              style={{
                display: isActive ? 'contents' : 'none'
              }}
            >
              <Canvas
                ref={(el) => {
                  if (el) {
                    canvasRefs.current.set(ss.id, el)
                  } else {
                    canvasRefs.current.delete(ss.id)
                  }
                }}
                screenshot={ss}
                toolSettings={state.toolSettings}
                onAnnotationsChange={handleAnnotationsChange}
                onSelectAnnotation={(id) =>
                  dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: id })
                }
                selectedAnnotationId={
                  isActive ? state.selectedAnnotationId : null
                }
              />
            </div>
          )
        })}

        {state.screenshots.length === 0 && (
          <Canvas
            screenshot={null}
            toolSettings={state.toolSettings}
            onAnnotationsChange={handleAnnotationsChange}
            onSelectAnnotation={(id) =>
              dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: id })
            }
            selectedAnnotationId={null}
          />
        )}

        {/* Right: Toolbar + Export */}
        <div className="right-panel">
          <Toolbar
            toolSettings={state.toolSettings}
            onToolSettingsChange={handleToolSettingsChange}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onResetCounter={handleResetCounter}
          />
          <ExportPanel
            exportSettings={state.exportSettings}
            onExportSettingsChange={handleExportSettingsChange}
            onSaveOne={handleSaveCurrent}
            onSaveAll={handleSaveAll}
            isSaving={isSaving}
            screenshotCount={state.screenshots.length}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="status-bar">
        <span className="status-count">
          {state.screenshots.length} screenshot{state.screenshots.length !== 1 ? 's' : ''}
        </span>
        {statusText && <span className="status-text">{statusText}</span>}
      </div>
    </div>
  )
}

// ============================
// Root App
// ============================

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}

export default App
