import React from 'react'
import type { ExportSettings, ImageFormat } from '../../../shared/types'
import './ExportPanel.css'

interface ExportPanelProps {
  exportSettings: ExportSettings
  onExportSettingsChange: (changes: Partial<ExportSettings>) => void
  onSaveOne: () => void
  onSaveAll: () => void
  isSaving: boolean
  screenshotCount: number
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  exportSettings,
  onExportSettingsChange,
  onSaveOne,
  onSaveAll,
  isSaving,
  screenshotCount
}) => {
  const handleSelectFolder = async (): Promise<void> => {
    try {
      const folder = await window.electronAPI.selectFolder()
      if (folder) {
        onExportSettingsChange({ outputDir: folder })
      }
    } catch (err) {
      console.error('Failed to select folder:', err)
    }
  }

  const displayPath = exportSettings.outputDir || 'Not selected'

  return (
    <div className="export-panel">
      <div className="export-section">
        <div className="export-section-title">Export</div>

        {/* Output folder */}
        <div className="export-field">
          <span className="export-label">Output folder</span>
          <div className="folder-row">
            <div className="folder-path" title={exportSettings.outputDir}>
              {displayPath}
            </div>
            <button className="folder-btn" onClick={handleSelectFolder} title="Select folder">
              📁
            </button>
          </div>
        </div>

        {/* File name template */}
        <div className="export-field">
          <span className="export-label">File name template</span>
          <input
            className="export-input"
            type="text"
            value={exportSettings.fileNameTemplate}
            onChange={(e) => onExportSettingsChange({ fileNameTemplate: e.target.value })}
            placeholder="screenshot_[N]"
          />
        </div>

        {/* Format */}
        <div className="export-field">
          <span className="export-label">Format</span>
          <select
            className="export-select"
            value={exportSettings.format}
            onChange={(e) =>
              onExportSettingsChange({ format: e.target.value as ImageFormat })
            }
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </div>

        {/* Quality — hidden for PNG */}
        {exportSettings.format !== 'png' && (
          <div className="export-field">
            <span className="export-label">Quality</span>
            <div className="export-slider-row">
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={exportSettings.quality}
                onChange={(e) =>
                  onExportSettingsChange({ quality: parseInt(e.target.value, 10) })
                }
              />
              <span className="value">{exportSettings.quality}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Save buttons */}
      <div className="save-buttons">
        <button
          className="save-btn primary"
          disabled={isSaving || screenshotCount === 0}
          onClick={onSaveOne}
        >
          Save current <span className="hint">Ctrl+S</span>
        </button>
        <button
          className="save-btn secondary"
          disabled={isSaving || screenshotCount === 0}
          onClick={onSaveAll}
        >
          Save all <span className="count-badge">{screenshotCount}</span>{' '}
          <span className="hint">Ctrl+Shift+S</span>
        </button>
      </div>
    </div>
  )
}

export default ExportPanel
