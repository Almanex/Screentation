// IPC channel names
export const IPC = {
  CLIPBOARD_READ: 'clipboard:read-image',
  DIALOG_SELECT_FOLDER: 'dialog:select-folder',
  FILE_SAVE_IMAGE: 'file:save-image',
  FILE_SAVE_ALL: 'file:save-all',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  CLIPBOARD_NEW_IMAGE: 'clipboard:new-image'
} as const

// Default annotation colors
export const ANNOTATION_COLORS = [
  { name: 'Red', value: '#e74c3c' },
  { name: 'Green', value: '#2ecc71' },
  { name: 'Blue', value: '#3498db' },
  { name: 'Yellow', value: '#f1c40f' }
] as const

// Default settings
export const DEFAULTS = {
  RECT_COLOR: '#e74c3c',
  RECT_STROKE_WIDTH: 3,
  RECT_FILL_ENABLED: true,
  STEP_COLOR: '#e74c3c',
  STEP_RADIUS: 18,
  FILE_NAME_TEMPLATE: 'screenshot_[N]',
  FORMAT: 'png' as const,
  QUALITY: 85,
  STEP_COUNTER: 1
} as const
