import type { Mode } from './game/puzzle'

export interface ModeProgress {
  level: number // level on screen
  best: number // highest level unlocked
  turns?: number[] // rotation of each tile in the current level (0-3)
}

export interface Settings {
  sound: boolean
  haptics: boolean
}

export interface Progress {
  calm: ModeProgress
  dusk: ModeProgress
  settings: Settings
}

const KEY = 'calm:progress'

const fresh = (): Progress => ({
  calm: { level: 1, best: 1 },
  dusk: { level: 1, best: 1 },
  settings: { sound: true, haptics: true },
})

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh()
    const p = JSON.parse(raw) as Partial<Progress>
    const base = fresh()
    return {
      calm: { ...base.calm, ...p.calm },
      dusk: { ...base.dusk, ...p.dusk },
      settings: { ...base.settings, ...p.settings },
    }
  } catch {
    return fresh()
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // Storage full or blocked: the game still works, progress just isn't kept.
  }
}

export function withMode(p: Progress, mode: Mode, patch: Partial<ModeProgress>): Progress {
  return { ...p, [mode]: { ...p[mode], ...patch } }
}
