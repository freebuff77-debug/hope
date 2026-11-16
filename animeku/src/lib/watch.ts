import type { WatchLink } from '../types'

interface RawLink {
  url: string | null
  site: string
  type: string | null
  language: string | null
  color: string | null
  icon: string | null
  notes: string | null
  isDisabled: boolean | null
}

/** Licensed streaming pages for a title, as listed by the data source. */
export function officialLinks(raw: RawLink[] | null | undefined): WatchLink[] {
  const seen = new Set<string>()
  const out: WatchLink[] = []
  for (const l of raw ?? []) {
    if (l.type !== 'STREAMING' || l.isDisabled || !l.url || !/^https?:\/\//i.test(l.url)) continue
    const key = `${l.site}|${l.language ?? ''}|${l.url}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ site: l.site, url: l.url.replace(/^http:\/\//i, 'https://'), language: l.language, color: l.color, icon: l.icon, notes: l.notes })
  }
  return out
}

/** "Episode 12 - A Title" -> 12. */
export function parseEpisodeNumber(title: string): number | null {
  const m = /^\s*(?:episode|ep\.?)\s*(\d+)/i.exec(title)
  return m ? Number(m[1]) : null
}

/** Strips the leading "Episode 12 - " so only the episode's own name is left. */
export function episodeName(title: string): string {
  return title.replace(/^\s*(?:episode|ep\.?)\s*\d+\s*[-–:]?\s*/i, '').trim()
}

const enc = encodeURIComponent

interface Shortcut {
  site: string
  match: RegExp
  url: (title: string) => string
  notes: string
}

// Official services that carry anime in Indonesia. These open a search on the
// service itself; nothing is fetched or played by Animeku.
const SHORTCUTS: Shortcut[] = [
  { site: 'YouTube · Muse Indonesia', match: /^$/, url: (t) => `https://www.youtube.com/results?search_query=${enc(`${t} Muse Indonesia`)}`, notes: 'Kanal resmi, gratis' },
  { site: 'YouTube · Ani-One Asia', match: /^$/, url: (t) => `https://www.youtube.com/results?search_query=${enc(`${t} Ani-One Asia`)}`, notes: 'Kanal resmi, gratis' },
  { site: 'Bstation', match: /bilibili/i, url: (t) => `https://www.bilibili.tv/id/search-result?q=${enc(t)}`, notes: 'Gratis dengan iklan' },
  { site: 'Crunchyroll', match: /crunchyroll/i, url: (t) => `https://www.crunchyroll.com/search?q=${enc(t)}`, notes: 'Langganan' },
  { site: 'Netflix', match: /netflix/i, url: (t) => `https://www.netflix.com/search?q=${enc(t)}`, notes: 'Langganan' },
]

/** Search links for services that aren't already among the title's official links. */
export function searchShortcuts(title: string, have: WatchLink[]): WatchLink[] {
  if (!title.trim()) return []
  return SHORTCUTS.filter((s) => !have.some((l) => s.match.test(l.site))).map((s) => ({
    site: s.site,
    url: s.url(title),
    language: null,
    color: null,
    icon: null,
    notes: s.notes,
  }))
}

export const trailerUrl = (id: string) => `https://www.youtube.com/watch?v=${enc(id)}`
