import { useEffect } from 'react'

export type HotkeyMap = Record<string, (e: KeyboardEvent) => void>

function normalizeKey(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')

  let key = e.key
  // For letter keys, use code to remain layout-independent
  if (e.code.startsWith('Key')) {
    key = e.code.replace('Key', '').toLowerCase()
  } else if (key === ' ') {
    key = 'Space'
  } else if (key.length === 1) {
    key = key.toLowerCase()
  }

  parts.push(key)
  return parts.join('+')
}

export function useHotkeys(hotkeyMap: HotkeyMap): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignore hotkeys when focus is in an input/textarea
      const target = e.target as HTMLElement
      const tag = target.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return

      const combo = normalizeKey(e)
      const handler = hotkeyMap[combo]
      if (handler) {
        e.preventDefault()
        e.stopPropagation()
        handler(e)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hotkeyMap])
}
