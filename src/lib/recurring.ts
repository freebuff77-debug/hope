import type { Recurring, Frequency } from '../types'
import { addDays, addMonths, fromLocalISO, toLocalISO, toDateKey } from './dates'

/** The n-th occurrence (0-based), computed from the start so month-end dates never drift. */
export function occurrence(r: Pick<Recurring, 'startDate' | 'frequency' | 'interval'>, n: number): Date {
  const start = fromLocalISO(r.startDate)
  const step = n * Math.max(1, r.interval)
  switch (r.frequency) {
    case 'daily':
      return addDays(start, step)
    case 'weekly':
      return addDays(start, step * 7)
    case 'monthly':
      return addMonths(start, step)
    case 'yearly':
      return addMonths(start, step * 12)
  }
}

export function nextDue(r: Recurring): Date | null {
  if (!r.active) return null
  const d = occurrence(r, r.count)
  if (r.endDate && toDateKey(d) > r.endDate) return null
  return d
}

/** Occurrences that are due at `now` and not yet handled, oldest first (capped to avoid runaway loops). */
export function dueOccurrences(r: Recurring, now: Date, cap = 366): { index: number; date: string }[] {
  const out: { index: number; date: string }[] = []
  if (!r.active) return out
  const nowKey = toLocalISO(now)
  for (let i = r.count; out.length < cap; i++) {
    const d = occurrence(r, i)
    const key = toLocalISO(d)
    if (key > nowKey) break
    if (r.endDate && toDateKey(d) > r.endDate) break
    out.push({ index: i, date: key })
  }
  return out
}

export const FREQ_LABEL: Record<Frequency, string> = {
  daily: 'hari',
  weekly: 'minggu',
  monthly: 'bulan',
  yearly: 'tahun',
}

export function describeSchedule(r: Pick<Recurring, 'frequency' | 'interval'>): string {
  return r.interval > 1 ? `Tiap ${r.interval} ${FREQ_LABEL[r.frequency]}` : `Tiap ${FREQ_LABEL[r.frequency]}`
}
