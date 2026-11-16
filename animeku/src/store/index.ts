import { useSyncExternalStore } from 'react'
import { emptyState, parseState, type LibraryState } from './library'

const KEY = 'animeku:library'

let state: LibraryState = emptyState()
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded) return
  loaded = true
  try {
    state = parseState(localStorage.getItem(KEY))
  } catch {
    state = emptyState()
  }
}

export function getState(): LibraryState {
  load()
  return state
}

/** Applies a pure update, saves it, and tells subscribers. No-op when nothing changed. */
export function update(fn: (s: LibraryState) => LibraryState) {
  load()
  const next = fn(state)
  if (next === state) return
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked: keep working in memory.
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useLibrary<T>(selector: (s: LibraryState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()))
}
