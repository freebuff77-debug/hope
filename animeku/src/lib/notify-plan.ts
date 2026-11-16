import type { Entry } from '../store/library'

export interface Upcoming {
  mediaId: number
  episode: number
  airingAt: number
}

export interface PlannedNotification {
  id: number
  mediaId: number
  episode: number
  /** Unix seconds. */
  at: number
  title: string
  body: string
}

/** Stable 31-bit id per (anime, episode); Android needs an int. */
export function notificationId(mediaId: number, episode: number): number {
  return ((mediaId % 200_003) * 10_007 + episode) % 2_147_483_647
}

/**
 * One notification per upcoming episode of every followed anime that has
 * alerts on, soonest first. Falls back to the entry's saved next episode when
 * fresh schedule data is missing (offline).
 */
export function planNotifications(
  entries: Entry[],
  upcoming: Upcoming[],
  now: number,
  opts: { enabled: boolean; titleOf: (e: Entry) => string; max?: number },
): PlannedNotification[] {
  if (!opts.enabled) return []
  const wanted = new Map(entries.filter((e) => e.notify).map((e) => [e.id, e]))
  const slots = new Map<string, Upcoming>()
  for (const u of upcoming) if (wanted.has(u.mediaId) && u.airingAt > now) slots.set(`${u.mediaId}:${u.episode}`, u)
  for (const e of wanted.values()) {
    if (!e.next || e.next.airingAt <= now) continue
    const key = `${e.id}:${e.next.episode}`
    if (!slots.has(key)) slots.set(key, { mediaId: e.id, episode: e.next.episode, airingAt: e.next.airingAt })
  }
  return [...slots.values()]
    .sort((a, b) => a.airingAt - b.airingAt || a.mediaId - b.mediaId)
    .slice(0, opts.max ?? 60)
    .map((u) => ({
      id: notificationId(u.mediaId, u.episode),
      mediaId: u.mediaId,
      episode: u.episode,
      at: u.airingAt,
      title: `${opts.titleOf(wanted.get(u.mediaId)!)} · Episode ${u.episode}`,
      body: 'Sudah tayang. Ketuk untuk lihat tempat nonton resminya.',
    }))
}

/** What to cancel and what to (re)schedule to get from `current` to `next`. */
export function diffPlan(current: { id: number; at: number }[], next: PlannedNotification[]): { cancel: number[]; schedule: PlannedNotification[] } {
  const cur = new Map(current.map((c) => [c.id, c.at]))
  const wanted = new Map(next.map((n) => [n.id, n]))
  return {
    cancel: current.filter((c) => !wanted.has(c.id)).map((c) => c.id),
    // A changed air time (delay) is rescheduled under the same id, which replaces the old alarm.
    schedule: next.filter((n) => cur.get(n.id) !== n.at),
  }
}
