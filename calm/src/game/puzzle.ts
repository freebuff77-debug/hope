/**
 * Puzzle model. A tile is a bitmask of connectors, bit d = side d, numbered
 * clockwise from the top. Square tiles have 4 sides (N, E, S, W), hex tiles
 * (flat-top, odd columns shifted down) have 6 (N, NE, SE, S, SW, NW).
 *
 * Modes
 * - calm:   every connector meets a connector on the neighbouring tile.
 * - dusk:   the opposite, no two connectors may touch.
 * - hex:    calm rules on a hexagonal board.
 * - energy: one tile is a power source; light every bulb (single-connector tile).
 *
 * Levels come from a seed, so level N is the same on every phone.
 */

export type Mode = 'calm' | 'dusk' | 'hex' | 'energy'
export type Grid = 'square' | 'hex'

export const MODES: Mode[] = ['calm', 'dusk', 'hex', 'energy']

// Square side bits, handy for hand-written boards.
export const N = 1
export const E = 2
export const S = 4
export const W = 8

export interface Shape {
  mode: Mode
  grid: Grid
  sides: 4 | 6
  cols: number
  rows: number
  /** Power source tile (energy mode), otherwise -1. */
  source: number
}

export interface Level extends Shape {
  number: number
  /** Scrambled tiles as shown at the start, row-major. */
  tiles: number[]
  /** One known solution; tile i of `tiles` is a rotation of `solution[i]`. */
  solution: number[]
}

export const gridOf = (mode: Mode): Grid => (mode === 'hex' ? 'hex' : 'square')
export const sidesOf = (grid: Grid): 4 | 6 => (grid === 'hex' ? 6 : 4)
export const opposite = (d: number, sides: number) => (d + sides / 2) % sides

/** Rotates clockwise by `turns` steps (90° for squares, 60° for hexes). */
export function rotate(mask: number, turns = 1, sides = 4): number {
  const full = (1 << sides) - 1
  const t = ((turns % sides) + sides) % sides
  let m = mask
  for (let i = 0; i < t; i++) m = ((m << 1) | (m >> (sides - 1))) & full
  return m
}

export function bits(mask: number): number {
  let n = 0
  for (let m = mask; m; m &= m - 1) n++
  return n
}

/** Distinct orientations of a tile (a straight square line only has 2). */
export function orientations(mask: number, sides = 4): number {
  const seen = new Set<number>()
  for (let t = 0; t < sides; t++) seen.add(rotate(mask, t, sides))
  return seen.size
}

export function neighbor(grid: Grid, cols: number, rows: number, i: number, d: number): number {
  const c = i % cols
  let nc = c
  let nr = (i - c) / cols
  if (grid === 'square') {
    if (d === 0) nr--
    else if (d === 1) nc++
    else if (d === 2) nr++
    else nc--
  } else {
    const odd = c & 1
    switch (d) {
      case 0: nr--; break
      case 1: nc++; if (!odd) nr--; break
      case 2: nc++; if (odd) nr++; break
      case 3: nr++; break
      case 4: nc--; if (odd) nr++; break
      default: nc--; if (!odd) nr--
    }
  }
  if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) return -1
  return nr * cols + nc
}

/** Tiles reachable from the power source through matching connectors. */
export function poweredSet(b: Shape, tiles: number[]): Set<number> {
  const seen = new Set<number>()
  if (b.source < 0) return seen
  const stack = [b.source]
  seen.add(b.source)
  while (stack.length) {
    const i = stack.pop()!
    for (let d = 0; d < b.sides; d++) {
      if (!(tiles[i] & (1 << d))) continue
      const j = neighbor(b.grid, b.cols, b.rows, i, d)
      if (j < 0 || seen.has(j) || !(tiles[j] & (1 << opposite(d, b.sides)))) continue
      seen.add(j)
      stack.push(j)
    }
  }
  return seen
}

export const isBulb = (b: Shape, tiles: number[], i: number) => i !== b.source && bits(tiles[i]) === 1

export function isSolved(b: Shape, tiles: number[]): boolean {
  if (b.mode === 'energy') {
    const lit = poweredSet(b, tiles)
    return tiles.every((_, i) => !isBulb(b, tiles, i) || lit.has(i))
  }
  for (let i = 0; i < tiles.length; i++) {
    for (let d = 0; d < b.sides; d++) {
      const mine = !!(tiles[i] & (1 << d))
      const j = neighbor(b.grid, b.cols, b.rows, i, d)
      const theirs = j >= 0 && !!(tiles[j] & (1 << opposite(d, b.sides)))
      if (b.mode === 'dusk' ? mine && theirs : mine !== theirs) return false
    }
  }
  return true
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(key: string): number {
  let h = 2166136261
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

/** Board grows slowly, then stays at a size that still fits a phone screen. */
export function sizeFor(mode: Mode, level: number): { cols: number; rows: number } {
  const step = (every: number, start: number, max: number) => Math.min(max, start + Math.floor((level - 1) / every))
  switch (mode) {
    case 'hex':
      return { cols: step(12, 3, 6), rows: step(8, 4, 8) }
    case 'energy':
      return { cols: step(15, 4, 6), rows: step(10, 5, 9) }
    default: {
      const cols = step(10, 3, 7)
      return { cols, rows: Math.max(step(5, 4, 11), cols + 1) }
    }
  }
}

/** calm/hex: every edge is shared or empty. dusk: every edge is owned by at most one side. */
function edgeLayout(b: Shape, rand: () => number, density: number): number[] {
  const tiles = new Array(b.cols * b.rows).fill(0)
  for (let i = 0; i < tiles.length; i++) {
    for (let d = 0; d < b.sides; d++) {
      const j = neighbor(b.grid, b.cols, b.rows, i, d)
      if (b.mode === 'dusk' && j < 0) {
        // Dusk tiles may point off the board.
        if (rand() < 0.4) tiles[i] |= 1 << d
        continue
      }
      if (j <= i || rand() >= density) continue
      if (b.mode !== 'dusk') {
        tiles[i] |= 1 << d
        tiles[j] |= 1 << opposite(d, b.sides)
      } else if (rand() < 0.5) tiles[i] |= 1 << d
      else tiles[j] |= 1 << opposite(d, b.sides)
    }
  }
  return tiles
}

/** energy: a random spanning tree grown from the centre; its leaves are the bulbs. */
function treeLayout(b: Shape, rand: () => number): number[] {
  const tiles = new Array(b.cols * b.rows).fill(0)
  const inTree = new Set([b.source])
  const frontier: [number, number][] = []
  const grow = (i: number) => {
    for (let d = 0; d < b.sides; d++) frontier.push([i, d])
  }
  grow(b.source)
  while (frontier.length) {
    const k = Math.floor(rand() * frontier.length)
    const [i, d] = frontier[k]
    frontier[k] = frontier[frontier.length - 1]
    frontier.pop()
    const j = neighbor(b.grid, b.cols, b.rows, i, d)
    if (j < 0 || inTree.has(j)) continue
    tiles[i] |= 1 << d
    tiles[j] |= 1 << opposite(d, b.sides)
    inTree.add(j)
    grow(j)
  }
  return tiles
}

export function generate(mode: Mode, number: number, key = `${mode}:${number}`): Level {
  const rand = mulberry32(hash(key))
  const grid = gridOf(mode)
  const sides = sidesOf(grid)
  const { cols, rows } = sizeFor(mode, number)
  const center = Math.floor(rows / 2) * cols + Math.floor(cols / 2)
  const shape: Shape = { mode, grid, sides, cols, rows, source: mode === 'energy' ? center : -1 }

  let solution: number[]
  if (mode === 'energy') {
    solution = treeLayout(shape, rand)
  } else {
    // Early levels are sparse and gentle; density settles after ~40 levels.
    const ramp = Math.min(1, (number - 1) / 40)
    const base = mode === 'calm' ? 0.46 : mode === 'dusk' ? 0.42 : 0.3
    const density = base + ramp * (mode === 'hex' ? 0.12 : 0.16)
    solution = edgeLayout(shape, rand, density)
    // Rare sparse boards are dull; redraw until at least half the tiles have a piece.
    for (let tries = 0; tries < 20 && solution.filter(Boolean).length < cols * rows * 0.5; tries++) {
      solution = edgeLayout(shape, rand, density)
    }
  }

  let tiles = solution
  for (let tries = 0; tries < 50; tries++) {
    tiles = solution.map((m) => rotate(m, Math.floor(rand() * sides), sides))
    if (!isSolved(shape, tiles)) break
  }
  return { ...shape, number, tiles, solution }
}

/** A tile that is not in its solved position, and how many taps fix it. */
export function hintStep(level: Level, turns: number[], rand = Math.random): { index: number; add: number } | null {
  const wrong: { index: number; add: number }[] = []
  level.tiles.forEach((base, i) => {
    if (!base) return
    const t = turns[i] ?? 0
    if (rotate(base, t, level.sides) === level.solution[i]) return
    for (let k = 1; k < level.sides; k++) {
      if (rotate(base, t + k, level.sides) === level.solution[i]) {
        wrong.push({ index: i, add: k })
        return
      }
    }
  })
  return wrong.length ? wrong[Math.floor(rand() * wrong.length)] : null
}

// ---------- daily challenge ----------

const DAILY_MODES: Mode[] = ['calm', 'hex', 'energy', 'dusk']

const dayIndex = (dateKey: string) => {
  const [y, m, d] = dateKey.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function dailyMode(dateKey: string): Mode {
  return DAILY_MODES[dayIndex(dateKey) % DAILY_MODES.length]
}

/** One bigger puzzle per calendar day, rotating through the modes. */
export function dailyLevel(dateKey: string): Level {
  const day = dayIndex(dateKey)
  return generate(dailyMode(dateKey), 40 + (day % 25), `daily:${dateKey}`)
}
