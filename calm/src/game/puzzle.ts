/**
 * Puzzle model. Each tile is a 4-bit mask of connectors: N=1, E=2, S=4, W=8.
 *
 * Calm mode: every connector must meet a connector on the neighbouring tile,
 * and nothing may point off the board (all lines form closed shapes).
 * Dusk mode: the opposite. No connector may touch another one.
 *
 * Levels are generated from a seed, so level N is the same on every phone.
 */

export type Mode = 'calm' | 'dusk'

export const N = 1
export const E = 2
export const S = 4
export const W = 8

export interface Level {
  mode: Mode
  number: number
  cols: number
  rows: number
  /** One known solution; every tile in `tiles` is a rotation of the same index here. */
  solution: number[]
  /** Scrambled tiles as shown at the start, row-major. */
  tiles: number[]
}

export function rotate(mask: number, turns = 1): number {
  let m = mask
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15
  return m
}

export function bits(mask: number): number {
  return (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1)
}

/** Distinct orientations of a tile (a straight line only has 2, a cross 1). */
export function orientations(mask: number): number {
  const seen = new Set<number>()
  for (let t = 0; t < 4; t++) seen.add(rotate(mask, t))
  return seen.size
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

function seedFor(mode: Mode, level: number): number {
  let h = 2166136261
  for (const ch of `${mode}:${level}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

/** Board grows slowly, then stays at a size that still fits a phone screen. */
export function sizeFor(level: number): { cols: number; rows: number } {
  const cols = Math.min(7, 3 + Math.floor((level - 1) / 10))
  const rows = Math.min(11, 4 + Math.floor((level - 1) / 5))
  return { cols, rows: Math.max(rows, cols + 1) }
}

/** Solved layout: in calm mode every edge is shared or empty; in dusk mode every edge is owned by at most one side. */
function solvedLayout(mode: Mode, cols: number, rows: number, rand: () => number, level: number): number[] {
  const tiles = new Array(cols * rows).fill(0)
  const at = (c: number, r: number) => r * cols + c
  // Early levels are sparse and gentle; density settles after ~40 levels.
  const ramp = Math.min(1, (level - 1) / 40)
  const density = (mode === 'calm' ? 0.46 : 0.42) + ramp * 0.16
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pairs: [number, number, number, number][] = []
      if (c + 1 < cols) pairs.push([at(c, r), E, at(c + 1, r), W])
      if (r + 1 < rows) pairs.push([at(c, r), S, at(c, r + 1), N])
      for (const [a, da, b, db] of pairs) {
        if (rand() >= density) continue
        if (mode === 'calm') {
          tiles[a] |= da
          tiles[b] |= db
        } else if (rand() < 0.5) tiles[a] |= da
        else tiles[b] |= db
      }
      if (mode === 'dusk') {
        // Dusk tiles may also point off the board.
        if (c === 0 && rand() < 0.4) tiles[at(c, r)] |= W
        if (c === cols - 1 && rand() < 0.4) tiles[at(c, r)] |= E
        if (r === 0 && rand() < 0.4) tiles[at(c, r)] |= N
        if (r === rows - 1 && rand() < 0.4) tiles[at(c, r)] |= S
      }
    }
  }
  return tiles
}

export function isSolved(mode: Mode, cols: number, rows: number, tiles: number[]): boolean {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const m = tiles[r * cols + c]
      const east = c + 1 < cols ? tiles[r * cols + c + 1] : 0
      const south = r + 1 < rows ? tiles[(r + 1) * cols + c] : 0
      const eastLink = !!(m & E) && !!(east & W)
      const southLink = !!(m & S) && !!(south & N)
      if (mode === 'calm') {
        if (!!(m & E) !== (c + 1 < cols && !!(east & W))) return false
        if (!!(m & S) !== (r + 1 < rows && !!(south & N))) return false
        if (c === 0 && m & W) return false
        if (r === 0 && m & N) return false
      } else if (eastLink || southLink) {
        return false
      }
    }
  }
  return true
}

/** Which connectors of tile i currently meet a neighbour (for highlighting). */
export function linkedSides(cols: number, rows: number, tiles: number[], i: number): number {
  const c = i % cols
  const r = Math.floor(i / cols)
  const m = tiles[i]
  let out = 0
  if (m & N && r > 0 && tiles[i - cols] & S) out |= N
  if (m & S && r + 1 < rows && tiles[i + cols] & N) out |= S
  if (m & W && c > 0 && tiles[i - 1] & E) out |= W
  if (m & E && c + 1 < cols && tiles[i + 1] & W) out |= E
  return out
}

export function generate(mode: Mode, number: number): Level {
  const rand = mulberry32(seedFor(mode, number))
  const { cols, rows } = sizeFor(number)
  let solved = solvedLayout(mode, cols, rows, rand, number)
  // Rare sparse boards are dull; redraw until at least half the tiles have a piece.
  for (let tries = 0; tries < 20 && solved.filter(Boolean).length < cols * rows * 0.5; tries++) {
    solved = solvedLayout(mode, cols, rows, rand, number)
  }
  let tiles = solved
  for (let tries = 0; tries < 50; tries++) {
    tiles = solved.map((m) => rotate(m, Math.floor(rand() * 4)))
    // Make sure the player has something to do.
    if (!isSolved(mode, cols, rows, tiles)) break
  }
  return { mode, number, cols, rows, tiles, solution: solved }
}
