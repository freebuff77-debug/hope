import type { Mode } from './game/puzzle'

export interface ModeProgress {
  level: number // level on screen
  best: number // highest level unlocked
  turns?: number[] // rotation of each tile in the current level
}

export interface Settings {
  sound: boolean
  haptics: boolean
}

export interface DailyProgress {
  done: string[] // local dates "YYYY-MM-DD" that were solved
  date?: string // date of the in-progress board below
  turns?: number[]
}

export interface Progress {
  v: 2
  calm: ModeProgress
  dusk: ModeProgress
  hex: ModeProgress
  energy: ModeProgress
  daily: DailyProgress
  settings: Settings
}

const KEY = 'calm:progress'

const fresh = (): Progress => ({
  v: 2,
  calm: { level: 1, best: 1 },
  dusk: { level: 1, best: 1 },
  hex: { level: 1, best: 1 },
  energy: { level: 1, best: 1 },
  daily: { done: [] },
  settings: { sound: true, haptics: true },
})

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh()
    const p = JSON.parse(raw) as Partial<Progress> & { v?: number }
    const base = fresh()
    // v1 boards were generated differently; keep levels but drop half-played tile positions.
    const keepTurns = p.v === 2
    const mode = (m: Mode): ModeProgress => {
      const mp = { ...base[m], ...p[m] }
      return keepTurns ? mp : { level: mp.level, best: mp.best }
    }
    return {
      v: 2,
      calm: mode('calm'),
      dusk: mode('dusk'),
      hex: mode('hex'),
      energy: mode('energy'),
      daily: { ...base.daily, ...p.daily },
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

const pad = (n: number) => String(n).padStart(2, '0')
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function prevDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d - 1))
}

/** Consecutive solved days ending today, or yesterday if today isn't solved yet. */
export function streak(done: string[], today: string): number {
  const set = new Set(done)
  let day = set.has(today) ? today : prevDay(today)
  let n = 0
  while (set.has(day)) {
    n++
    day = prevDay(day)
  }
  return n
}
