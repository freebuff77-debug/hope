/** Times from the API are Unix seconds; everything is shown in the phone's own time zone. */

export const nowSec = () => Math.floor(Date.now() / 1000)

const pad = (n: number) => String(n).padStart(2, '0')
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** "baru saja", "12 mnt lalu", "3 jam lalu", "kemarin", "4 hari lalu". */
export function relativePast(secondsAgo: number): string {
  const s = Math.max(0, secondsAgo)
  if (s < 60) return 'baru saja'
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`
  const days = Math.floor(s / 86400)
  return days === 1 ? 'kemarin' : `${days} hari lalu`
}

/** "sebentar lagi", "12 mnt lagi", "3 jam 5 mnt lagi", "2 hari 4 jam lagi". */
export function countdown(secondsLeft: number): string {
  const s = Math.max(0, secondsLeft)
  if (s < 60) return 'sebentar lagi'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return h ? `${d} hari ${h} jam lagi` : `${d} hari lagi`
  if (h > 0) return m ? `${h} jam ${m} mnt lagi` : `${h} jam lagi`
  return `${m} mnt lagi`
}

export function clock(sec: number): string {
  const d = new Date(sec * 1000)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** A local calendar day as [start, end) in Unix seconds. */
export function dayRange(d: Date): { start: number; end: number } {
  return { start: Math.floor(startOfDay(d).getTime() / 1000), end: Math.floor(addDays(d, 1).getTime() / 1000) }
}

const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000)

export function dayLabel(d: Date, today: Date): { short: string; long: string } {
  const diff = dayDiff(d, today)
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  if (diff === 0) return { short: 'Hari ini', long: `Hari ini, ${DAYS_LONG[d.getDay()]} ${date}` }
  if (diff === 1) return { short: 'Besok', long: `Besok, ${DAYS_LONG[d.getDay()]} ${date}` }
  if (diff === -1) return { short: 'Kemarin', long: `Kemarin, ${DAYS_LONG[d.getDay()]} ${date}` }
  return { short: `${DAYS[d.getDay()]} ${d.getDate()}`, long: `${DAYS_LONG[d.getDay()]}, ${date}` }
}

/** "Sen, 16 Nov · 19:30" (adds the year when it isn't this year). */
export function dateTime(sec: number, today = new Date()): string {
  const d = new Date(sec * 1000)
  const year = d.getFullYear() !== today.getFullYear() ? ` ${d.getFullYear()}` : ''
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${year} · ${clock(sec)}`
}

export function shortDate(sec: number, today = new Date()): string {
  const d = new Date(sec * 1000)
  const year = d.getFullYear() !== today.getFullYear() ? ` ${d.getFullYear()}` : ''
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}`
}

/** When an episode is or was out, phrased for a list row. */
export function airingPhrase(airingAt: number, now: number): string {
  return airingAt <= now ? `Tayang ${relativePast(now - airingAt)}` : `Tayang ${countdown(airingAt - now)}`
}

export function currentSeason(d: Date): { season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'; year: number } {
  const m = d.getMonth()
  const season = m < 3 ? 'WINTER' : m < 6 ? 'SPRING' : m < 9 ? 'SUMMER' : 'FALL'
  return { season, year: d.getFullYear() }
}
