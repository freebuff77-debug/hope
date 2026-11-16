import type { AnimeCard, MediaStatus, NextAiring, Title } from '../types'
import { progressOf } from '../lib/episodes'

/** A followed anime with enough of a snapshot to show the list offline. */
export interface Entry {
  id: number
  title: Title
  cover: string
  color: string | null
  format: string | null
  status: MediaStatus | null
  episodes: number | null
  next: NextAiring | null
  /** Notify when a new episode airs. */
  notify: boolean
  pinned: boolean
  /** Episode numbers marked as watched. */
  watched: number[]
  /** Episodes already out when the user started following; they don't count as "new". */
  baseline: number
  addedAt: number
  updatedAt: number
}

export interface HistoryItem {
  id: number
  episode: number
  at: number
}

export interface Settings {
  titleLang: 'romaji' | 'english' | 'native'
  theme: 'dark' | 'light' | 'system'
  notifications: boolean
  dataSaver: boolean
}

export interface LibraryState {
  v: 1
  entries: Record<string, Entry>
  history: HistoryItem[]
  settings: Settings
  lastBackupAt?: number
}

export const DEFAULT_SETTINGS: Settings = { titleLang: 'romaji', theme: 'dark', notifications: true, dataSaver: false }
export const emptyState = (): LibraryState => ({ v: 1, entries: {}, history: [], settings: { ...DEFAULT_SETTINGS } })

const HISTORY_MAX = 300
const BACKUP_FORMAT = 'animeku-backup'

const snapshot = (c: AnimeCard) => ({ title: c.title, cover: c.cover, color: c.color, format: c.format, status: c.status, episodes: c.episodes, next: c.next })

// ---------- pure updates ----------

export function follow(s: LibraryState, card: AnimeCard, aired: number | null, now: number): LibraryState {
  if (s.entries[card.id]) return s
  const entry: Entry = {
    id: card.id,
    ...snapshot(card),
    notify: card.status === 'RELEASING' || card.status === 'NOT_YET_RELEASED',
    pinned: false,
    watched: [],
    baseline: aired ?? 0,
    addedAt: now,
    updatedAt: now,
  }
  return { ...s, entries: { ...s.entries, [card.id]: entry } }
}

export function unfollow(s: LibraryState, id: number): LibraryState {
  if (!s.entries[id]) return s
  const entries = { ...s.entries }
  delete entries[id]
  return { ...s, entries, history: s.history.filter((h) => h.id !== id) }
}

function patch(s: LibraryState, id: number, fn: (e: Entry) => Partial<Entry>, now: number): LibraryState {
  const e = s.entries[id]
  if (!e) return s
  return { ...s, entries: { ...s.entries, [id]: { ...e, ...fn(e), updatedAt: now } } }
}

export const toggleNotify = (s: LibraryState, id: number, now: number) => patch(s, id, (e) => ({ notify: !e.notify }), now)
export const togglePin = (s: LibraryState, id: number, now: number) => patch(s, id, (e) => ({ pinned: !e.pinned }), now)

/**
 * 'toggle' flips one episode. 'upTo' marks 1..episode as watched, or, when
 * `episode` is already the furthest watched, un-marks it (so a mis-tap undoes).
 */
export function setWatched(s: LibraryState, id: number, episode: number, mode: 'toggle' | 'upTo', now: number): LibraryState {
  const e = s.entries[id]
  if (!e || episode < 1) return s
  const set = new Set(e.watched)
  let added = false
  if (mode === 'toggle') {
    if (set.has(episode)) set.delete(episode)
    else {
      set.add(episode)
      added = true
    }
  } else if (progressOf(e.watched) === episode && set.has(episode)) {
    set.delete(episode)
  } else {
    for (let n = 1; n <= episode; n++) set.add(n)
    for (const n of [...set]) if (n > episode) set.delete(n)
    added = true
  }
  const watched = [...set].sort((a, b) => a - b)
  const history = added ? [{ id, episode, at: now }, ...s.history.filter((h) => !(h.id === id && h.episode === episode))].slice(0, HISTORY_MAX) : s.history
  return { ...patch(s, id, () => ({ watched }), now), history }
}

/** Refreshes stored snapshots from fresh data so the list stays right offline. */
export function refreshSnapshots(s: LibraryState, cards: AnimeCard[]): LibraryState {
  let entries = s.entries
  for (const c of cards) {
    const e = entries[c.id]
    if (!e) continue
    const snap = snapshot(c)
    if (JSON.stringify(snap) === JSON.stringify(snapshot(e as unknown as AnimeCard))) continue
    if (entries === s.entries) entries = { ...entries }
    entries[c.id] = { ...e, ...snap }
  }
  return entries === s.entries ? s : { ...s, entries }
}

export function setSettings(s: LibraryState, p: Partial<Settings>): LibraryState {
  return { ...s, settings: { ...s.settings, ...p } }
}

// ---------- backup ----------

export function exportBackup(s: LibraryState, now: number): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: new Date(now).toISOString(), entries: s.entries, history: s.history, settings: s.settings })
}

const isEntry = (e: unknown): e is Entry => {
  const x = e as Entry
  return !!x && typeof x.id === 'number' && typeof x.title === 'object' && Array.isArray(x.watched)
}

export function importBackup(json: string): LibraryState {
  let data: { format?: string; entries?: unknown; history?: unknown; settings?: Partial<Settings> }
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('File ini bukan cadangan Animeku.')
  }
  if (data?.format !== BACKUP_FORMAT || typeof data.entries !== 'object' || !data.entries) throw new Error('File ini bukan cadangan Animeku.')
  const entries: Record<string, Entry> = {}
  for (const e of Object.values(data.entries as Record<string, unknown>)) {
    if (!isEntry(e)) continue
    entries[e.id] = {
      ...e,
      watched: e.watched.filter((n) => Number.isInteger(n) && n > 0),
      notify: !!e.notify,
      pinned: !!e.pinned,
      baseline: Number(e.baseline) || 0,
    }
  }
  const history = Array.isArray(data.history) ? (data.history as HistoryItem[]).filter((h) => h && entries[h.id] && Number.isInteger(h.episode)).slice(0, HISTORY_MAX) : []
  return { v: 1, entries, history, settings: { ...DEFAULT_SETTINGS, ...data.settings } }
}

/** Loads saved state, tolerating missing fields from older versions and corrupt data. */
export function parseState(raw: string | null): LibraryState {
  if (!raw) return emptyState()
  try {
    const p = JSON.parse(raw) as Partial<LibraryState>
    return { v: 1, entries: p.entries ?? {}, history: p.history ?? [], settings: { ...DEFAULT_SETTINGS, ...p.settings }, lastBackupAt: p.lastBackupAt }
  } catch {
    return emptyState()
  }
}

export const sortedEntries = (s: LibraryState): Entry[] =>
  Object.values(s.entries).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
