import { memo } from 'react'
import { E, N, S, W, bits } from './puzzle'

/** Tile geometry in a 100x100 box. Lines run from edge midpoints; corners are quarter circles. */
const MID: Record<number, [number, number]> = { [N]: [50, 0], [E]: [100, 50], [S]: [50, 100], [W]: [0, 50] }
const SIDES = [N, E, S, W]
const OPPOSITE: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E }
const NEXT: Record<number, number> = { [N]: E, [E]: S, [S]: W, [W]: N }
const PREV: Record<number, number> = { [N]: W, [E]: N, [S]: E, [W]: S }
const END_R = 17

function arc(a: number, b: number): string {
  const [ax, ay] = MID[a]
  const [bx, by] = MID[b]
  const cx = ax + bx - 50
  const cy = ay + by - 50
  let delta = Math.atan2(by - cy, bx - cx) - Math.atan2(ay - cy, ax - cx)
  if (delta > Math.PI) delta -= 2 * Math.PI
  if (delta < -Math.PI) delta += 2 * Math.PI
  return `M${ax} ${ay} A50 50 0 0 ${delta > 0 ? 1 : 0} ${bx} ${by}`
}

export function tilePath(mask: number): { d: string; ring: boolean } {
  const on = SIDES.filter((s) => mask & s)
  switch (bits(mask)) {
    case 1: {
      const [x, y] = MID[on[0]]
      // Stop the line at the ring's edge.
      const ex = 50 + ((x - 50) / 50) * END_R
      const ey = 50 + ((y - 50) / 50) * END_R
      return { d: `M${x} ${y} L${ex} ${ey}`, ring: true }
    }
    case 2: {
      const [a, b] = on
      if (OPPOSITE[a] === b) return { d: `M${MID[a].join(' ')} L${MID[b].join(' ')}`, ring: false }
      return { d: arc(a, b), ring: false }
    }
    case 3: {
      const missing = SIDES.find((s) => !(mask & s))!
      const stem = OPPOSITE[missing]
      return { d: `${arc(PREV[stem], stem)} ${arc(stem, NEXT[stem])}`, ring: false }
    }
    case 4:
      return { d: `${arc(N, E)} ${arc(E, S)} ${arc(S, W)} ${arc(W, N)}`, ring: false }
    default:
      return { d: '', ring: false }
  }
}

interface Props {
  index: number
  x: number
  y: number
  base: number
  turns: number
  color: string
  stroke: number
  disabled: boolean
  label: string
  onTurn: (index: number) => void
}

/** Draws the unrotated piece and spins the group, so taps always animate clockwise. */
export const Tile = memo(function Tile({ index, x, y, base, turns, color, stroke, disabled, label, onTurn }: Props) {
  const { d, ring } = tilePath(base)
  const empty = base === 0
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className="tile"
        style={{ transform: `rotate(${turns * 90}deg)` }}
        role={empty ? undefined : 'button'}
        aria-label={empty ? undefined : label}
        aria-disabled={disabled || undefined}
        tabIndex={empty || disabled ? undefined : 0}
        onPointerDown={(e) => {
          if (empty || disabled || e.button !== 0) return
          e.preventDefault()
          onTurn(index)
        }}
        onKeyDown={(e) => {
          if (!empty && !disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onTurn(index)
          }
        }}
      >
        {/* Full-cell hit area; also fixes the rotation centre at the cell middle. */}
        <rect width="100" height="100" fill="transparent" />
        {d && <path d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" className="ink" />}
        {ring && <circle cx="50" cy="50" r={END_R} fill="none" stroke={color} strokeWidth={stroke} className="ink" />}
      </g>
    </g>
  )
})
