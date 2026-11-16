export type MediaStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS'

export interface Title {
  romaji: string | null
  english: string | null
  native: string | null
}

/** Next episode to air. `airingAt` is a Unix time in seconds. */
export interface NextAiring {
  episode: number
  airingAt: number
}

export interface AnimeCard {
  id: number
  title: Title
  cover: string
  coverSmall: string
  color: string | null
  format: string | null
  status: MediaStatus | null
  episodes: number | null
  score: number | null
  genres: string[]
  next: NextAiring | null
  season: string | null
  year: number | null
  country: string | null
}

/** One episode going out at one moment. */
export interface Airing {
  id: number
  episode: number
  airingAt: number
  anime: AnimeCard
}

export interface WatchLink {
  site: string
  url: string
  language: string | null
  color: string | null
  icon: string | null
  notes: string | null
}

/** A per-episode link published by an official service. */
export interface OfficialEpisode {
  episode: number | null
  title: string
  thumbnail: string | null
  url: string
  site: string
}

export interface AnimeDetail extends AnimeCard {
  banner: string | null
  description: string | null
  duration: number | null
  studios: string[]
  source: string | null
  startDate: string | null
  endDate: string | null
  popularity: number | null
  trailer: { id: string; thumbnail: string | null } | null
  links: WatchLink[]
  officialEpisodes: OfficialEpisode[]
  /** Newest schedule entries first; up to 50, so long-running shows only have their recent ones. */
  schedule: { episode: number; airingAt: number }[]
  relations: { type: string; anime: AnimeCard }[]
  recommendations: AnimeCard[]
  siteUrl: string
}

export interface HomeData {
  trending: AnimeCard[]
  season: AnimeCard[]
  top: AnimeCard[]
  /** Aired and upcoming episodes around `fetchedAt`, oldest first. */
  airings: Airing[]
  fetchedAt: number
}

export interface BrowseFilters {
  search: string
  genres: string[]
  year: number | null
  season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | null
  format: string | null
  status: MediaStatus | null
  sort: 'POPULARITY_DESC' | 'TRENDING_DESC' | 'SCORE_DESC' | 'START_DATE_DESC'
}

export const EMPTY_FILTERS: BrowseFilters = { search: '', genres: [], year: null, season: null, format: null, status: null, sort: 'POPULARITY_DESC' }
