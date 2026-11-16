import type { AnimeCard, AnimeDetail, OfficialEpisode } from '../types'

type Slot = { episode: number; airingAt: number }
type Airable = Pick<AnimeCard, 'status' | 'episodes' | 'next'>

const maxEpisode = (slots: Slot[]) => slots.reduce((m, s) => Math.max(m, s.episode), 0)

/**
 * How many episodes have gone out by `now`, or null when the data can't tell.
 *
 * Works from the clock, not from when the data was fetched: once `now` passes
 * an episode's air time it counts, even if the cached data is hours old.
 */
export function airedCount(a: Airable, now: number, schedule: Slot[] = []): number | null {
  if (a.status === 'FINISHED') return a.episodes ?? (maxEpisode(schedule) || null)

  let n = 0
  let known = false
  if (a.next) {
    n = a.next.airingAt <= now ? a.next.episode : a.next.episode - 1
    known = true
  }
  for (const s of schedule) {
    known = true
    if (s.airingAt <= now && s.episode > n) n = s.episode
  }
  if (!a.next && schedule.length && n === 0) {
    // Everything we know about is still in the future; earlier episodes are out.
    n = Math.min(...schedule.map((s) => s.episode)) - 1
  }
  if (known) return Math.max(0, n)
  return a.status === 'NOT_YET_RELEASED' ? 0 : null
}

/** Last episode number we know exists (aired or announced), or null. */
export function totalEpisodes(a: Airable, schedule: Slot[] = [], official: OfficialEpisode[] = []): number | null {
  const fromOfficial = official.reduce((m, e) => Math.max(m, e.episode ?? 0), 0)
  const n = Math.max(a.episodes ?? 0, maxEpisode(schedule), a.next?.episode ?? 0, fromOfficial)
  return n || null
}

export interface EpisodeItem {
  number: number
  airingAt: number | null
  state: 'aired' | 'upcoming' | 'unknown'
  official: OfficialEpisode | null
}

/** Every episode from 1 to the last one known, each with its air time and state. */
export function buildEpisodes(d: AnimeDetail, now: number): EpisodeItem[] {
  const last = totalEpisodes(d, d.schedule, d.officialEpisodes)
  if (!last) return []
  const aired = airedCount(d, now, d.schedule)
  const times = new Map(d.schedule.map((s) => [s.episode, s.airingAt]))
  if (d.next && !times.has(d.next.episode)) times.set(d.next.episode, d.next.airingAt)
  const official = new Map<number, OfficialEpisode>()
  for (const e of d.officialEpisodes) if (e.episode && !official.has(e.episode)) official.set(e.episode, e)

  const out: EpisodeItem[] = []
  for (let n = 1; n <= last; n++) {
    const airingAt = times.get(n) ?? null
    const state = airingAt !== null ? (airingAt <= now ? 'aired' : 'upcoming') : aired === null ? 'unknown' : n <= aired ? 'aired' : 'upcoming'
    out.push({ number: n, airingAt, state, official: official.get(n) ?? null })
  }
  return out
}

/** Highest episode the user has marked as watched. */
export const progressOf = (watched: number[]) => watched.reduce((m, n) => Math.max(m, n), 0)

/**
 * Episodes that are out and newer than both the user's progress and the point
 * where they started following (so following a 1,000-episode show doesn't
 * report 1,000 new episodes).
 */
export function newEpisodes(watched: number[], baseline: number, aired: number | null): number {
  if (aired === null) return 0
  return Math.max(0, aired - Math.max(progressOf(watched), baseline))
}

/** The episode to watch next, if it is already out. */
export function nextToWatch(watched: number[], aired: number | null): number | null {
  const next = progressOf(watched) + 1
  return aired !== null && next <= aired ? next : null
}

/** Splits a long episode list into ranges of `size` for range chips. */
export function episodeRanges(total: number, size = 50): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = []
  for (let from = 1; from <= total; from += size) out.push({ from, to: Math.min(total, from + size - 1) })
  return out
}
