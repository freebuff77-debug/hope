import { describe, expect, it } from 'vitest'
import {
  E, MODES, N, S, W, bits, dailyLevel, dailyMode, generate, hintStep, isBulb, isSolved, neighbor, orientations,
  poweredSet, rotate, sizeFor, type Shape,
} from './puzzle'
import { streak } from '../storage'

const sq = (mode: Shape['mode'], cols: number, rows: number, source = -1): Shape => ({ mode, grid: 'square', sides: 4, cols, rows, source })

describe('tiles', () => {
  it('rotates clockwise on squares and hexes', () => {
    expect(rotate(N)).toBe(E)
    expect(rotate(W)).toBe(N)
    expect(rotate(N | E)).toBe(E | S)
    expect(rotate(N | S, 2)).toBe(N | S)
    expect(rotate(0b000001, 1, 6)).toBe(0b000010)
    expect(rotate(0b100000, 1, 6)).toBe(0b000001)
    expect(rotate(0b001001, 3, 6)).toBe(0b001001)
  })

  it('counts orientations and bits', () => {
    expect(orientations(N | S)).toBe(2)
    expect(orientations(N | E | S | W)).toBe(1)
    expect(orientations(0b001001, 6)).toBe(3)
    expect(bits(N | E | S)).toBe(3)
  })

  it('finds hex neighbours for even and odd columns', () => {
    // 3x3 board, centre column is odd (shifted down).
    expect(neighbor('hex', 3, 3, 4, 0)).toBe(1) // N
    expect(neighbor('hex', 3, 3, 4, 1)).toBe(5) // NE of odd col: same row
    expect(neighbor('hex', 3, 3, 4, 2)).toBe(8) // SE of odd col: next row
    expect(neighbor('hex', 3, 3, 3, 1)).toBe(1) // NE of even col: row above
    expect(neighbor('hex', 3, 3, 0, 5)).toBe(-1)
  })
})

describe('solved check', () => {
  it('calm: a 2x2 ring is solved, a dangling end is not', () => {
    expect(isSolved(sq('calm', 2, 2), [E | S, S | W, N | E, N | W])).toBe(true)
    expect(isSolved(sq('calm', 2, 2), [E | S, S | W, N | E, W])).toBe(false)
    expect(isSolved(sq('calm', 1, 1), [N])).toBe(false)
  })

  it('dusk: touching connectors fail, pointing outward is fine', () => {
    expect(isSolved(sq('dusk', 2, 1), [E, W])).toBe(false)
    expect(isSolved(sq('dusk', 2, 1), [W, E])).toBe(true)
  })

  it('energy: every bulb must be powered', () => {
    // source in the middle of a 3x1 row, bulbs either side
    const b = sq('energy', 3, 1, 1)
    expect(isSolved(b, [E, E | W, W])).toBe(true)
    expect(isSolved(b, [W, E | W, W])).toBe(false)
    expect([...poweredSet(b, [W, E | W, W])].sort()).toEqual([1, 2])
    expect(isBulb(b, [E, E | W, W], 1)).toBe(false)
  })
})

describe('level generator', () => {
  it('is deterministic per mode and level', () => {
    expect(generate('calm', 7)).toEqual(generate('calm', 7))
    expect(generate('calm', 7).tiles).not.toEqual(generate('dusk', 7).tiles)
  })

  it('keeps every board phone-sized', () => {
    expect(sizeFor('calm', 1)).toEqual({ cols: 3, rows: 4 })
    for (const mode of MODES) {
      const big = sizeFor(mode, 10_000)
      expect(big.cols).toBeLessThanOrEqual(7)
      expect(big.rows).toBeLessThanOrEqual(11)
    }
  })

  it('every level starts unsolved and is a scramble of a solved board', () => {
    for (const mode of MODES) {
      for (let n = 1; n <= 200; n++) {
        const l = generate(mode, n)
        expect(l.tiles).toHaveLength(l.cols * l.rows)
        expect(isSolved(l, l.tiles), `${mode} ${n} starts solved`).toBe(false)
        expect(isSolved(l, l.solution), `${mode} ${n} solution`).toBe(true)
        l.tiles.forEach((t, i) => {
          expect([...Array(l.sides).keys()].some((k) => rotate(t, k, l.sides) === l.solution[i])).toBe(true)
        })
      }
    }
  })

  it('energy boards connect every tile to the source', () => {
    for (let n = 1; n <= 50; n++) {
      const l = generate('energy', n)
      expect(poweredSet(l, l.solution).size).toBe(l.cols * l.rows)
      expect(l.solution.filter((_, i) => isBulb(l, l.solution, i)).length).toBeGreaterThan(1)
    }
  })

  it('hints walk a board to solved', () => {
    for (const mode of MODES) {
      const l = generate(mode, 12)
      const turns = new Array(l.tiles.length).fill(0)
      for (let step = 0; step < 200; step++) {
        const h = hintStep(l, turns, () => 0)
        if (!h) break
        turns[h.index] += h.add
      }
      expect(isSolved(l, l.tiles.map((t, i) => rotate(t, turns[i], l.sides)))).toBe(true)
    }
  })
})

describe('daily challenge', () => {
  it('is the same puzzle all day and rotates modes', () => {
    expect(dailyLevel('2026-11-16')).toEqual(dailyLevel('2026-11-16'))
    expect(new Set(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].map(dailyMode)).size).toBe(4)
  })

  it('counts a streak that may end today or yesterday', () => {
    expect(streak([], '2026-11-16')).toBe(0)
    expect(streak(['2026-11-14', '2026-11-15', '2026-11-16'], '2026-11-16')).toBe(3)
    expect(streak(['2026-11-14', '2026-11-15'], '2026-11-16')).toBe(2)
    expect(streak(['2026-11-13', '2026-11-15'], '2026-11-16')).toBe(1)
    expect(streak(['2026-11-10'], '2026-11-16')).toBe(0)
    expect(streak(['2026-02-28', '2026-03-01'], '2026-03-01')).toBe(2)
  })
})
