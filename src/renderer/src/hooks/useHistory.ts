import { useCallback, useRef, useState } from 'react'

const MAX_HISTORY = 50

interface HistoryState<T> {
  stack: T[]
  pointer: number
}

export function useHistory<T>(initialState: T) {
  const historyRef = useRef<HistoryState<T>>({
    stack: [initialState],
    pointer: 0
  })

  // We use a simple counter to force re-renders when history changes
  const [, setTick] = useState(0)
  const forceTick = useCallback(() => setTick((t) => t + 1), [])

  const getState = useCallback((): T => {
    const h = historyRef.current
    return h.stack[h.pointer]
  }, [])

  const pushState = useCallback(
    (newState: T) => {
      const h = historyRef.current
      // Discard any future states (branching)
      const newStack = h.stack.slice(0, h.pointer + 1)
      newStack.push(newState)

      // Enforce max history limit
      if (newStack.length > MAX_HISTORY) {
        newStack.shift()
        h.pointer = newStack.length - 1
      } else {
        h.pointer = newStack.length - 1
      }

      h.stack = newStack
      forceTick()
    },
    [forceTick]
  )

  const undo = useCallback(() => {
    const h = historyRef.current
    if (h.pointer > 0) {
      h.pointer--
      forceTick()
    }
  }, [forceTick])

  const redo = useCallback(() => {
    const h = historyRef.current
    if (h.pointer < h.stack.length - 1) {
      h.pointer++
      forceTick()
    }
  }, [forceTick])

  const reset = useCallback(
    (newState: T) => {
      historyRef.current = {
        stack: [newState],
        pointer: 0
      }
      forceTick()
    },
    [forceTick]
  )

  const h = historyRef.current

  return {
    state: h.stack[h.pointer],
    pushState,
    undo,
    redo,
    canUndo: h.pointer > 0,
    canRedo: h.pointer < h.stack.length - 1,
    reset,
    getState,
    historyRef
  }
}
