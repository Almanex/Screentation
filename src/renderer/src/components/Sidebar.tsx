import React from 'react'
import type { Screenshot } from '../../../shared/types'
import './Sidebar.css'

interface SidebarProps {
  screenshots: Screenshot[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onPaste: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ screenshots, activeId, onSelect, onDelete, onPaste }) => {
  if (screenshots.length === 0) {
    return (
      <div className="sidebar">
        <button className="sidebar-paste-btn" onClick={onPaste} title="Paste from clipboard (Ctrl+V)">
          📋 Paste
        </button>
        <div className="sidebar-empty">
          <div className="icon">🖼️</div>
          <div className="text">
            Paste or drop
            <br />
            screenshots here
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar">
      <button className="sidebar-paste-btn" onClick={onPaste} title="Paste from clipboard (Ctrl+V)">
        📋 Paste
      </button>
      <div className="sidebar-list">
        {screenshots.map((ss, index) => (
          <div
            key={ss.id}
            className={`sidebar-card ${activeId === ss.id ? 'active' : ''}`}
            onClick={() => onSelect(ss.id)}
          >
            <img className="thumbnail" src={ss.dataUrl} alt={`Screenshot ${index + 1}`} />
            <div className="badge">{index + 1}</div>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(ss.id)
              }}
              title="Remove screenshot"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sidebar
