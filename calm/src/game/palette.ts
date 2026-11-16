import type { Mode } from './puzzle'

export interface Palette {
  bg: string
  ink: string // pieces while playing
  done: string // pieces once the level is solved
  soft: string // secondary text
  dark: boolean
}

// Muted, low-contrast-but-readable tones. One per level, cycling.
const CALM: Palette[] = [
  { bg: '#eaf2ee', ink: '#3e5a50', done: '#24845f', soft: '#6b8279', dark: false }, // sage
  { bg: '#e8eef6', ink: '#3e4f68', done: '#2f63ad', soft: '#6a778b', dark: false }, // mist
  { bg: '#f4eee6', ink: '#5e5043', done: '#a86a2e', soft: '#857766', dark: false }, // sand
  { bg: '#efeaf5', ink: '#4f4566', done: '#6d4fae', soft: '#7a7090', dark: false }, // lavender
  { bg: '#f6eaec', ink: '#644750', done: '#b04a61', soft: '#8b7077', dark: false }, // blush
  { bg: '#e6f2f3', ink: '#3b5a5e', done: '#1f7f88', soft: '#66848a', dark: false }, // lagoon
]

const DUSK: Palette[] = [
  { bg: '#121822', ink: '#c3cee0', done: '#86b6ff', soft: '#7d889b', dark: true }, // night
  { bg: '#17141f', ink: '#d0c8e2', done: '#b9a0ff', soft: '#857d98', dark: true }, // plum
  { bg: '#101a18', ink: '#c2dbd3', done: '#71d4ae', soft: '#7a918a', dark: true }, // pine
  { bg: '#1c1615', ink: '#e0d0ca', done: '#ffb08c', soft: '#978680', dark: true }, // ember
]

export function paletteFor(mode: Mode, level: number): Palette {
  const list = mode === 'calm' ? CALM : DUSK
  return list[(level - 1) % list.length]
}

export const HOME_PALETTE = CALM[0]
