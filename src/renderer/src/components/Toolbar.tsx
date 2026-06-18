import React from 'react'
import type { ToolSettings, ToolType } from '../../../shared/types'
import { ANNOTATION_COLORS } from '../../../shared/constants'
import './Toolbar.css'

interface ToolbarProps {
  toolSettings: ToolSettings
  onToolSettingsChange: (changes: Partial<ToolSettings>) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onResetCounter: () => void
}

const TOOLS: Array<{ type: ToolType; icon: string; label: string }> = [
  { type: 'select', icon: '⊹', label: 'Select' },
  { type: 'rect', icon: '▢', label: 'Rect' },
  { type: 'step', icon: '①', label: 'Step' },
  { type: 'arrow', icon: '↗', label: 'Arrow' },
  { type: 'blur', icon: '░', label: 'Blur' }
]

const Toolbar: React.FC<ToolbarProps> = ({
  toolSettings,
  onToolSettingsChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onResetCounter
}) => {
  const activeColor =
    toolSettings.activeTool === 'step' ? toolSettings.stepColor : toolSettings.rectColor

  const handleColorChange = (color: string): void => {
    if (toolSettings.activeTool === 'step') {
      onToolSettingsChange({ stepColor: color })
    } else {
      onToolSettingsChange({ rectColor: color })
    }
  }

  return (
    <div className="toolbar">
      {/* TOOLS */}
      <div className="toolbar-section">
        <div className="toolbar-section-title">Tools</div>
        <div className="tool-buttons">
          {TOOLS.map((tool) => (
            <button
              key={tool.type}
              className={`tool-btn ${toolSettings.activeTool === tool.type ? 'active' : ''}`}
              onClick={() => onToolSettingsChange({ activeTool: tool.type })}
              title={tool.label}
            >
              <span>{tool.icon}</span>
              <span className="label">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* COLOR */}
      <div className="toolbar-section">
        <div className="toolbar-section-title">Color</div>
        <div className="color-row">
          {ANNOTATION_COLORS.map((c) => (
            <div
              key={c.value}
              className={`color-swatch ${activeColor === c.value ? 'active' : ''}`}
              style={{ backgroundColor: c.value }}
              onClick={() => handleColorChange(c.value)}
              title={c.name}
            >
              {activeColor === c.value ? '✓' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* STROKE WIDTH — only for rect or arrow */}
      {(toolSettings.activeTool === 'rect' || toolSettings.activeTool === 'arrow') && (
        <div className="toolbar-section">
          <div className="toolbar-section-title">Stroke</div>
          <div className="toolbar-slider-row">
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={toolSettings.rectStrokeWidth}
              onChange={(e) =>
                onToolSettingsChange({ rectStrokeWidth: parseInt(e.target.value, 10) })
              }
            />
            <span className="value">{toolSettings.rectStrokeWidth}px</span>
          </div>
        </div>
      )}

      {/* FILL OPTION — only for rect */}
      {toolSettings.activeTool === 'rect' && (
        <div className="toolbar-section">
          <div className="toolbar-checkbox-row">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={toolSettings.rectFillEnabled}
                onChange={(e) =>
                  onToolSettingsChange({ rectFillEnabled: e.target.checked })
                }
              />
              <span className="label-text">Fill Area</span>
            </label>
          </div>
        </div>
      )}

      {/* STEP SIZE — only for step */}
      {toolSettings.activeTool === 'step' && (
        <div className="toolbar-section">
          <div className="toolbar-section-title">Step Size</div>
          <div className="toolbar-slider-row">
            <input
              type="range"
              min={12}
              max={32}
              step={1}
              value={toolSettings.stepRadius}
              onChange={(e) =>
                onToolSettingsChange({ stepRadius: parseInt(e.target.value, 10) })
              }
            />
            <span className="value">{toolSettings.stepRadius}px</span>
          </div>
        </div>
      )}

      {/* HISTORY */}
      <div className="toolbar-section">
        <div className="toolbar-section-title">History</div>
        <div className="history-buttons">
          <button className="history-btn" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">
            <span>↩</span>
            <span className="label">Undo</span>
          </button>
          <button className="history-btn" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)">
            <span>↪</span>
            <span className="label">Redo</span>
          </button>
        </div>
      </div>

      {/* RESET COUNTER — only for step */}
      {toolSettings.activeTool === 'step' && (
        <div className="toolbar-section">
          <div className="toolbar-section-title">Counter</div>
          <button className="reset-btn" onClick={onResetCounter}>
            ↻ Reset counter to 1
          </button>
        </div>
      )}
    </div>
  )
}

export default Toolbar
