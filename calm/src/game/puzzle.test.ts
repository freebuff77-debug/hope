import { describe, expect, it } from 'vitest'
import { E, N, S, W, bits, generate, isSolved, orientations, rotate, sizeFor } from './puzzle'

describe('tiles', () => {
  it('rotates clockwise', () => {
    expect(rotate(N)).toBe(E)
    expect(rotate(W)).toBe(N)
    expect(rotate(N | E)).toBe(E | S)
    expect(rotate(N | S, 2)).toBe(N | S)
    expect(rotate(N | E | S, 4)).toBe(N | E | S)
  })

  it('counts orientations', () => {
    expect(orientations(N | S)).toBe(2)
    expect(orientations(N | E | S | W)).toBe(1)
    expect(orientations(N | E)).toBe(4)
    expect(bits(N | E | S)).toBe(3)
  })
})

describe('solved check', () => {
  it('calm: a 2x2 ring is solved, a dangling end is not', () => {
    expect(isSolved('calm', 2, 2, [E | S, S | W, N | E, N | W])).toBe(true)
    expect(isSolved('calm', 2, 2, [E | S, S | W, N | E, W])).toBe(false)
    expect(isSolved('calm', 1, 1, [N])).toBe(false)
  })

  it('dusk: touching connectors fail, pointing outward is fine', () => {
    expect(isSolved('dusk', 2, 1, [E, W])).toBe(false)
    expect(isSolved('dusk', 2, 1, [W, E])).toBe(true)
    expect(isSolved('dusk', 2, 1, [E, N])).toBe(true)
  })
})

describe('level generator', () => {
  it('is deterministic per mode and level', () => {
    expect(generate('calm', 7)).toEqual(generate('calm', 7))
    expect(generate('calm', 7).tiles).not.toEqual(generate('dusk', 7).tiles)
  })

  it('grows the board but keeps it phone-sized', () => {
    expect(sizeFor(1)).toEqual({ cols: 3, rows: 4 })
    const big = sizeFor(10_000)
    expect(big.cols).toBeLessThanOrEqual(7)
    expect(big.rows).toBeLessThanOrEqual(11)
  })

  it('never starts solved and always has pieces', () => {
    for (const mode of ['calm', 'dusk'] as const) {
      for (let n = 1; n <= 300; n++) {
        const l = generate(mode, n)
        expect(l.tiles).toHaveLength(l.cols * l.rows)
        expect(isSolved(mode, l.cols, l.rows, l.tiles)).toBe(false)
        expect(l.tiles.filter(Boolean).length).toBeGreaterThan(0)
      }
    }
  })

  it('every level is a scramble of a solved board', () => {
    for (const mode of ['calm', 'dusk'] as const) {
      for (let n = 1; n <= 300; n++) {
        const l = generate(mode, n)
        expect(isSolved(mode, l.cols, l.rows, l.solution), `${mode} ${n}`).toBe(true)
        l.tiles.forEach((t, i) => {
          expect([0, 1, 2, 3].some((k) => rotate(t, k) === l.solution[i])).toBe(true)
        })
      }
    }
  })
})
