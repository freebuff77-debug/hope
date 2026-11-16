/** Local date-time strings: "YYYY-MM-DDTHH:mm". Sorting them as strings sorts by time. */

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ReportPeriod = Period | 'custom'

const pad = (n: number) => String(n).padStart(2, '0')

export function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromLocalISO(s: string): Date {
  const [date, time = '00:00'] = s.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0)
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes())
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate()
}

/** Adds months keeping the anchor day, clamped to the month's last day (Jan 31 + 1 = Feb 28/29). */
export function addMonths(d: Date, n: number, anchorDay = d.getDate()): Date {
  const total = d.getMonth() + n
  const y = d.getFullYear() + Math.floor(total / 12)
  const m = ((total % 12) + 12) % 12
  return new Date(y, m, Math.min(anchorDay, daysInMonth(y, m)), d.getHours(), d.getMinutes())
}

export interface Range {
  start: Date // inclusive
  end: Date // exclusive
}

export function periodRange(period: Period, ref: Date, weekStart = 1): Range {
  const d = startOfDay(ref)
  switch (period) {
    case 'daily':
      return { start: d, end: addDays(d, 1) }
    case 'weekly': {
      const diff = (d.getDay() - weekStart + 7) % 7
      const start = addDays(d, -diff)
      return { start, end: addDays(start, 7) }
    }
    case 'monthly': {
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      return { start, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) }
    }
    case 'yearly': {
      const start = new Date(d.getFullYear(), 0, 1)
      return { start, end: new Date(d.getFullYear() + 1, 0, 1) }
    }
  }
}

export function shiftPeriod(period: Period, ref: Date, step: number): Date {
  switch (period) {
    case 'daily':
      return addDays(ref, step)
    case 'weekly':
      return addDays(ref, step * 7)
    case 'monthly':
      return addMonths(ref, step, 1)
    case 'yearly':
      return new Date(ref.getFullYear() + step, 0, 1)
  }
}

export function rangeKeys(r: Range): { from: string; to: string } {
  return { from: toLocalISO(r.start), to: toLocalISO(r.end) }
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export const monthShort = (m: number) => MONTHS_SHORT[m]

export function fmtDate(d: Date, withYear = true): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`
}

export function fmtDayHeader(d: Date, today = new Date()): string {
  const diff = daysBetween(d, today)
  const base = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== today.getFullYear() ? ` ${d.getFullYear()}` : ''}`
  if (diff === 0) return `Hari ini · ${base}`
  if (diff === 1) return `Kemarin · ${base}`
  return base
}

export function fmtTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fmtRange(period: ReportPeriod, r: Range): string {
  switch (period) {
    case 'daily':
      return fmtDayHeader(r.start)
    case 'monthly':
      return `${MONTHS[r.start.getMonth()]} ${r.start.getFullYear()}`
    case 'yearly':
      return String(r.start.getFullYear())
    default: {
      const last = addDays(r.end, -1)
      return `${fmtDate(r.start, r.start.getFullYear() !== last.getFullYear())} – ${fmtDate(last)}`
    }
  }
}

export const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
  yearly: 'Tahunan',
  custom: 'Kustom',
}
