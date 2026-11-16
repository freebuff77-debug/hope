import type { Mode } from './puzzle'

export interface Palette {
  bg: string
  ink: string // pieces while playing (unpowered in energy mode)
  done: string // pieces once solved / powered
  soft: string // secondary text
  dark: boolean
}

// Muted tones, one per level, cycling.
const PALETTES: Record<Mode, Palette[]> = {
  calm: [
    { bg: '#eaf2ee', ink: '#3e5a50', done: '#24845f', soft: '#6b8279', dark: false }, // sage
    { bg: '#e8eef6', ink: '#3e4f68', done: '#2f63ad', soft: '#6a778b', dark: false }, // mist
    { bg: '#f4eee6', ink: '#5e5043', done: '#a86a2e', soft: '#857766', dark: false }, // sand
    { bg: '#efeaf5', ink: '#4f4566', done: '#6d4fae', soft: '#7a7090', dark: false }, // lavender
    { bg: '#f6eaec', ink: '#644750', done: '#b04a61', soft: '#8b7077', dark: false }, // blush
    { bg: '#e6f2f3', ink: '#3b5a5e', done: '#1f7f88', soft: '#66848a', dark: false }, // lagoon
  ],
  dusk: [
    { bg: '#121822', ink: '#c3cee0', done: '#86b6ff', soft: '#7d889b', dark: true }, // night
    { bg: '#17141f', ink: '#d0c8e2', done: '#b9a0ff', soft: '#857d98', dark: true }, // plum
    { bg: '#101a18', ink: '#c2dbd3', done: '#71d4ae', soft: '#7a918a', dark: true }, // pine
    { bg: '#1c1615', ink: '#e0d0ca', done: '#ffb08c', soft: '#978680', dark: true }, // ember
  ],
  hex: [
    { bg: '#f7ede4', ink: '#5f4b43', done: '#c75f37', soft: '#8a766c', dark: false }, // peach
    { bg: '#e9f3ea', ink: '#43584a', done: '#3c8a4f', soft: '#6f8475', dark: false }, // fern
    { bg: '#eef0f8', ink: '#464d6b', done: '#4d5fc4', soft: '#737a95', dark: false }, // periwinkle
    { bg: '#f8f0e2', ink: '#5d5240', done: '#b9861c', soft: '#877c69', dark: false }, // honey
  ],
  energy: [
    { bg: '#0e1424', ink: '#5d6b88', done: '#ffcf5a', soft: '#7a86a0', dark: true }, // night + amber
    { bg: '#120f20', ink: '#625c86', done: '#7ef0d2', soft: '#857fa3', dark: true }, // violet + mint
    { bg: '#0d1a17', ink: '#55736a', done: '#ffe08a', soft: '#7d968e', dark: true }, // forest + gold
    { bg: '#1a1112', ink: '#7a5f63', done: '#ff9f7a', soft: '#9a8285', dark: true }, // cocoa + coral
  ],
}

export function paletteFor(mode: Mode, level: number): Palette {
  const list = PALETTES[mode]
  return list[(level - 1) % list.length]
}

export const HOME_PALETTE = PALETTES.calm[0]

export const MODE_INFO: Record<Mode, { name: string; goal: string }> = {
  calm: { name: 'Terang', goal: 'Sambungkan semua garis' },
  dusk: { name: 'Gelap', goal: 'Putuskan semua sambungan' },
  hex: { name: 'Hex', goal: 'Sambungkan kepingan segi enam' },
  energy: { name: 'Energi', goal: 'Nyalakan semua lampu' },
}
