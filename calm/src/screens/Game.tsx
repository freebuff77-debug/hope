import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, House, Lightbulb, RotateCcw } from 'lucide-react'
import { Board, boardAspect } from '../game/Board'
import { hintStep, isSolved, rotate, type Level } from '../game/puzzle'
import type { Palette } from '../game/palette'
import { buzz, playSolved, playTurn } from '../feedback'
import type { Settings } from '../storage'

interface Props {
  level: Level
  palette: Palette
  title: string
  goal: string
  initialTurns?: number[]
  settings: Settings
  /** Level arrows; hidden when both are undefined (daily challenge). */
  canPrev?: boolean
  canNext?: boolean
  doneLabel: string
  onTurns: (turns: number[] | undefined) => void
  onSolved: () => void
  onPrev?: () => void
  onNext: () => void
  onExit: () => void
  onPalette: (p: Palette) => void
}

function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/** One board. Mount with a fresh `key` per level so state starts clean. */
export default function Game(props: Props) {
  const { level, palette: pal, settings, onTurns, onSolved, onPalette } = props
  const [turns, setTurns] = useState<number[]>(() =>
    props.initialTurns?.length === level.tiles.length ? props.initialTurns : new Array(level.tiles.length).fill(0),
  )
  const [hint, setHint] = useState({ index: -1, n: 0 })

  const masks = useMemo(() => level.tiles.map((t, i) => rotate(t, turns[i], level.sides)), [level, turns])
  const solved = isSolved(level, masks)

  useEffect(() => onPalette(pal), [pal, onPalette])

  const solvedAt = useRef(0)
  const wasSolved = useRef(solved)
  useEffect(() => {
    if (solved && !wasSolved.current) {
      solvedAt.current = Date.now()
      if (settings.sound) playSolved()
      if (settings.haptics) void buzz(true)
      onSolved()
    }
    wasSolved.current = solved
  }, [solved, settings, onSolved])

  const turnsRef = useRef(turns)
  turnsRef.current = turns
  const apply = useCallback(
    (next: number[]) => {
      turnsRef.current = next
      setTurns(next)
      onTurns(next.map((t) => t % level.sides))
    },
    [level.sides, onTurns],
  )

  const turn = useCallback(
    (i: number) => {
      const next = [...turnsRef.current]
      next[i] += 1
      apply(next)
      if (settings.sound) playTurn()
      if (settings.haptics) void buzz()
    },
    [apply, settings],
  )

  const showHint = () => {
    const step = hintStep(level, turnsRef.current)
    if (!step) return
    const next = [...turnsRef.current]
    next[step.index] += step.add
    apply(next)
    setHint((h) => ({ index: step.index, n: h.n + 1 }))
    if (settings.sound) playTurn()
  }

  const restart = () => {
    // Spin forward back to the start rather than unwinding every tap.
    apply(turnsRef.current.map((t) => t + ((level.sides - (t % level.sides)) % level.sides)))
    onTurns(undefined)
  }

  const next = () => {
    // A quick last tap shouldn't skip the finished board.
    if (Date.now() - solvedAt.current < 800) return
    props.onNext()
  }

  const [boxRef, box] = useBoxSize<HTMLDivElement>()
  const aspect = boardAspect(level)
  const scale = Math.min(box.w / aspect.w, box.h / aspect.h, 1.15)
  const width = Math.max(0, Math.floor(aspect.w * scale))
  const height = Math.max(0, Math.floor(aspect.h * scale))
  const arrows = props.canPrev !== undefined || props.canNext !== undefined

  return (
    <div className="safe flex h-dvh flex-col" style={{ color: pal.ink }}>
      <header className="flex items-center justify-between px-3 pt-2">
        <button type="button" onClick={props.onExit} aria-label="Menu utama" className="grid size-12 place-items-center rounded-full">
          <House className="size-6" style={{ color: pal.soft }} />
        </button>
        <div className="flex items-center gap-1">
          {arrows && (
            <button type="button" onClick={props.onPrev} disabled={!props.canPrev} aria-label="Level sebelumnya" className="grid size-11 place-items-center rounded-full disabled:opacity-25">
              <ChevronLeft className="size-5" style={{ color: pal.soft }} />
            </button>
          )}
          <p className="min-w-24 text-center text-lg font-bold tabular-nums" aria-live="polite">
            {props.title}
          </p>
          {arrows && (
            <button type="button" onClick={props.onNext} disabled={!props.canNext} aria-label="Level berikutnya" className="grid size-11 place-items-center rounded-full disabled:opacity-25">
              <ChevronRight className="size-5" style={{ color: pal.soft }} />
            </button>
          )}
        </div>
        <button type="button" onClick={restart} disabled={solved} aria-label="Ulangi level" className="grid size-12 place-items-center rounded-full disabled:opacity-0">
          <RotateCcw className="size-5" style={{ color: pal.soft }} />
        </button>
      </header>

      <p className="text-center text-sm font-semibold" style={{ color: pal.soft }}>
        {props.goal}
      </p>

      <div ref={boxRef} className="relative flex min-h-0 flex-1 items-center justify-center p-5" onPointerDown={() => solved && next()}>
        {width > 0 && (
          <Board
            level={level}
            turns={turns}
            ink={pal.ink}
            done={pal.done}
            solved={solved}
            interactive
            hintIndex={hint.index}
            hintKey={hint.n}
            onTurn={turn}
            width={width}
            height={height}
            className={solved ? 'solved-pulse' : 'board-in'}
            label={`Papan ${level.cols} kali ${level.rows}`}
          />
        )}
      </div>

      <div className="flex h-20 items-start justify-center px-6">
        {solved ? (
          <button type="button" onClick={next} className="fade-up rounded-full px-6 py-3 text-base font-bold" style={{ color: pal.done }}>
            {props.doneLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={showHint}
            className="flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold"
            style={{ color: pal.soft, boxShadow: `inset 0 0 0 1.5px ${pal.soft}55` }}
          >
            <Lightbulb className="size-4" aria-hidden /> Petunjuk
          </button>
        )}
      </div>
    </div>
  )
}
