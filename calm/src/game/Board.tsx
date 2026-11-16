import { memo, useMemo } from 'react'
import { bits, isBulb, poweredSet, rotate, type Grid, type Level } from './puzzle'

/** Distance from a tile's centre to the middle of each side, for both shapes. */
const A = 50
const HEX_R = (A * 2) / Math.sqrt(3)
const RING = 17

const angle = (d: number, sides: number) => ((-90 + (d * 360) / sides) * Math.PI) / 180
const point = (d: number, sides: number, dist = A): [number, number] => [dist * Math.cos(angle(d, sides)), dist * Math.sin(angle(d, sides))]
const fmt = (n: number) => Math.round(n * 100) / 100

/** Curve from side a to side b that leaves both sides at a right angle (straight line if opposite). */
function arcPath(a: number, b: number, sides: number): string {
  let steps = (b - a + sides) % sides
  if (steps * 2 > sides) {
    ;[a, b] = [b, a]
    steps = sides - steps
  }
  const [ax, ay] = point(a, sides)
  const [bx, by] = point(b, sides)
  if (steps * 2 === sides) return `M${fmt(ax)} ${fmt(ay)} L${fmt(bx)} ${fmt(by)}`
  const g = (steps * 2 * Math.PI) / sides
  const mid = angle(a, sides) + g / 2
  const dist = A / Math.cos(g / 2)
  const r = A * Math.tan(g / 2)
  const cx = dist * Math.cos(mid)
  const cy = dist * Math.sin(mid)
  let delta = Math.atan2(by - cy, bx - cx) - Math.atan2(ay - cy, ax - cx)
  if (delta > Math.PI) delta -= 2 * Math.PI
  if (delta < -Math.PI) delta += 2 * Math.PI
  return `M${fmt(ax)} ${fmt(ay)} A${fmt(r)} ${fmt(r)} 0 0 ${delta > 0 ? 1 : 0} ${fmt(bx)} ${fmt(by)}`
}

/** Path for a tile drawn around (0, 0). Single connectors end in a ring. */
export function tilePath(mask: number, sides: number): { d: string; ring: boolean } {
  const on = [...Array(sides).keys()].filter((d) => mask & (1 << d))
  if (on.length === 0) return { d: '', ring: false }
  if (on.length === 1) {
    const [x, y] = point(on[0], sides)
    const [ex, ey] = point(on[0], sides, RING)
    return { d: `M${fmt(x)} ${fmt(y)} L${fmt(ex)} ${fmt(ey)}`, ring: true }
  }
  if (on.length === 2) return { d: arcPath(on[0], on[1], sides), ring: false }
  // Join neighbours around the tile, leaving out the single widest gap (so a T stays a T).
  const gaps = on.map((d, k) => (on[(k + 1) % on.length] - d + sides) % sides || sides)
  const widest = Math.max(...gaps)
  const skip = gaps.filter((g) => g === widest).length === 1 ? gaps.indexOf(widest) : -1
  return { d: on.map((d, k) => (k === skip ? '' : arcPath(d, on[(k + 1) % on.length], sides))).join(' '), ring: false }
}

export function boardLayout(grid: Grid, cols: number, rows: number) {
  if (grid === 'square') {
    return {
      width: cols * 2 * A,
      height: rows * 2 * A,
      center: (i: number): [number, number] => [(i % cols) * 2 * A + A, Math.floor(i / cols) * 2 * A + A],
    }
  }
  return {
    width: 2 * HEX_R + (cols - 1) * 1.5 * HEX_R,
    height: rows * 2 * A + (cols > 1 ? A : 0),
    center: (i: number): [number, number] => {
      const c = i % cols
      const r = Math.floor(i / cols)
      return [HEX_R + c * 1.5 * HEX_R, A + r * 2 * A + (c & 1 ? A : 0)]
    },
  }
}

const HEX_POINTS = [...Array(6).keys()].map((k) => `${fmt(HEX_R * Math.cos((k * Math.PI) / 3))},${fmt(HEX_R * Math.sin((k * Math.PI) / 3))}`).join(' ')

interface TileProps {
  index: number
  cx: number
  cy: number
  base: number
  turns: number
  sides: number
  color: string
  kind: 'wire' | 'source' | 'bulb'
  lit: boolean
  hint: number | null
  interactive: boolean
  label: string
  onTurn?: (index: number) => void
}

/** Draws the unrotated piece and spins the group, so every tap animates clockwise. */
const Tile = memo(function Tile({ index, cx, cy, base, turns, sides, color, kind, lit, hint, interactive, label, onTurn }: TileProps) {
  const { d, ring } = tilePath(base, sides)
  const empty = base === 0
  const active = interactive && !empty
  return (
    <g transform={`translate(${fmt(cx)} ${fmt(cy)})`}>
      {hint !== null && <circle key={hint} r={A * 0.92} fill={color} className="hint-glow" />}
      <g
        className={interactive ? 'tile' : undefined}
        style={{ transform: `rotate(${(turns * 360) / sides}deg)` }}
        role={active ? 'button' : undefined}
        aria-label={active ? label : undefined}
        tabIndex={active ? 0 : undefined}
        onPointerDown={(e) => {
          if (!active || e.button !== 0) return
          e.preventDefault()
          onTurn?.(index)
        }}
        onKeyDown={(e) => {
          if (active && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onTurn?.(index)
          }
        }}
      >
        {/* Full-cell hit area; also fixes the rotation centre at the cell middle. */}
        {sides === 6 ? <polygon points={HEX_POINTS} fill="transparent" /> : <rect x={-A} y={-A} width={2 * A} height={2 * A} fill="transparent" />}
        {kind === 'source' ? (
          <>
            {[...Array(sides).keys()]
              .filter((s) => base & (1 << s))
              .map((s) => {
                const [x, y] = point(s, sides)
                return <path key={s} d={`M${fmt(x)} ${fmt(y)} L0 0`} stroke={color} strokeWidth={12} strokeLinecap="round" className="ink" />
              })}
            <circle r={A * 0.4} fill={color} className="ink-fill" />
            <path d="M3 -13 L-7 3 L1 3 L-3 13 L7 -3 L-1 -3 Z" fill="var(--bg)" />
          </>
        ) : (
          <>
            {d && <path d={d} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" className="ink" />}
            {ring && (
              <circle
                r={RING}
                stroke={color}
                strokeWidth={12}
                fill={kind === 'bulb' && lit ? color : 'transparent'}
                className="ink ink-fill"
              />
            )}
          </>
        )}
      </g>
    </g>
  )
})

interface BoardProps {
  level: Level
  /** Rotation of each tile; omit to draw `level.tiles` as is. */
  turns?: number[]
  ink: string
  done: string
  solved?: boolean
  interactive?: boolean
  hintIndex?: number
  /** Changes on every hint so the glow replays even on the same tile. */
  hintKey?: number
  onTurn?: (index: number) => void
  width?: number
  height?: number
  className?: string
  label?: string
}

export function Board({ level, turns, ink, done, solved = false, interactive = false, hintIndex = -1, hintKey = 0, onTurn, width, height, className, label }: BoardProps) {
  const layout = useMemo(() => boardLayout(level.grid, level.cols, level.rows), [level])
  const masks = useMemo(() => level.tiles.map((t, i) => rotate(t, turns?.[i] ?? 0, level.sides)), [level, turns])
  const lit = useMemo(() => (level.mode === 'energy' ? poweredSet(level, masks) : null), [level, masks])
  return (
    <svg
      width={width}
      height={height}
      viewBox={`-8 -8 ${fmt(layout.width + 16)} ${fmt(layout.height + 16)}`}
      className={className}
      role={label ? 'group' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {level.tiles.map((t, i) => {
        const [cx, cy] = layout.center(i)
        const kind = i === level.source ? 'source' : level.mode === 'energy' && isBulb(level, masks, i) ? 'bulb' : 'wire'
        const powered = lit ? lit.has(i) : false
        const color = solved || powered ? done : ink
        return (
          <Tile
            key={i}
            index={i}
            cx={cx}
            cy={cy}
            base={t}
            turns={turns?.[i] ?? 0}
            sides={level.sides}
            color={color}
            kind={bits(t) === 0 ? 'wire' : kind}
            lit={powered}
            hint={i === hintIndex ? hintKey : null}
            interactive={interactive && !solved}
            label={`Kepingan baris ${Math.floor(i / level.cols) + 1} kolom ${(i % level.cols) + 1}`}
            onTurn={onTurn}
          />
        )
      })}
    </svg>
  )
}

export const boardAspect = (level: Level) => {
  const l = boardLayout(level.grid, level.cols, level.rows)
  return { w: l.width + 16, h: l.height + 16 }
}
