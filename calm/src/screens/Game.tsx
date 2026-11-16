import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, House, RotateCcw } from 'lucide-react'
import { Tile } from '../game/Tile'
import { generate, isSolved, rotate, type Mode } from '../game/puzzle'
import { paletteFor } from '../game/palette'
import { buzz, playSolved, playTurn } from '../feedback'
import { withMode, type Progress } from '../storage'

interface Props {
  mode: Mode
  progress: Progress
  onProgress: (p: Progress) => void
  onExit: () => void
  onPalette: (bg: string, ink: string, dark: boolean) => void
}

const CELL = 100
const STROKE = 12

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

export default function Game({ mode, progress, onProgress, onExit, onPalette }: Props) {
  const mp = progress[mode]
  const levelNo = mp.level
  const level = useMemo(() => generate(mode, levelNo), [mode, levelNo])
  const pal = paletteFor(mode, levelNo)
  const { sound, haptics } = progress.settings

  const [turns, setTurns] = useState<number[]>(() =>
    mp.turns && mp.turns.length === level.tiles.length ? mp.turns : new Array(level.tiles.length).fill(0),
  )
  // Reset rotations when the level changes (state above only initialises once).
  const shownLevel = useRef(levelNo)
  if (shownLevel.current !== levelNo) {
    shownLevel.current = levelNo
    const saved = mp.turns && mp.turns.length === level.tiles.length ? mp.turns : new Array(level.tiles.length).fill(0)
    setTurns(saved)
  }

  const masks = useMemo(() => level.tiles.map((t, i) => rotate(t, turns[i] ?? 0)), [level, turns])
  const solved = turns.length === level.tiles.length && isSolved(mode, level.cols, level.rows, masks)

  // Keep the latest progress in a ref so tap handlers stay stable for memoised tiles.
  const progressRef = useRef(progress)
  progressRef.current = progress

  useEffect(() => onPalette(pal.bg, pal.ink, pal.dark), [pal, onPalette])

  const wasSolved = useRef(solved)
  // Ignore taps for a moment after solving, so a quick last tap doesn't skip the finished board.
  const solvedAt = useRef(0)
  useEffect(() => {
    if (solved && !wasSolved.current) {
      solvedAt.current = Date.now()
      if (sound) playSolved()
      if (haptics) void buzz(true)
      const p = progressRef.current
      onProgress(withMode(p, mode, { best: Math.max(p[mode].best, levelNo + 1), turns: undefined }))
    }
    wasSolved.current = solved
  }, [solved, sound, haptics, mode, levelNo, onProgress])

  const turnsRef = useRef(turns)
  turnsRef.current = turns
  const turn = useCallback(
    (i: number) => {
      const next = [...turnsRef.current]
      next[i] = (next[i] ?? 0) + 1
      turnsRef.current = next
      setTurns(next)
      onProgress(withMode(progressRef.current, mode, { turns: next.map((t) => t % 4) }))
      if (sound) playTurn()
      if (haptics) void buzz()
    },
    [mode, sound, haptics, onProgress],
  )

  const goTo = (n: number) => {
    const p = progressRef.current
    if (n < 1 || n > p[mode].best) return
    onProgress(withMode(p, mode, { level: n, turns: undefined }))
  }

  const next = () => {
    if (Date.now() - solvedAt.current < 800) return
    goTo(levelNo + 1)
  }

  const restart = () => {
    // Spin forward back to the starting position rather than unwinding every tap.
    setTurns((prev) => prev.map((t) => t + ((4 - (t % 4)) % 4)))
    onProgress(withMode(progressRef.current, mode, { turns: undefined }))
  }

  const [boxRef, box] = useBoxSize<HTMLDivElement>()
  const scale = Math.min(box.w / (level.cols * CELL), box.h / (level.rows * CELL), 1.15)
  const width = Math.max(0, Math.floor(level.cols * CELL * scale))
  const height = Math.max(0, Math.floor(level.rows * CELL * scale))

  const goal = mode === 'calm' ? 'Sambungkan semua garis' : 'Putuskan semua sambungan'

  return (
    <div className="safe flex h-dvh flex-col" style={{ color: pal.ink }}>
      <header className="flex items-center justify-between px-3 pt-2">
        <button type="button" onClick={onExit} aria-label="Menu utama" className="grid size-12 place-items-center rounded-full">
          <House className="size-6" style={{ color: pal.soft }} />
        </button>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => goTo(levelNo - 1)} disabled={levelNo <= 1} aria-label="Level sebelumnya" className="grid size-11 place-items-center rounded-full disabled:opacity-25">
            <ChevronLeft className="size-5" style={{ color: pal.soft }} />
          </button>
          <p className="min-w-24 text-center text-lg font-bold tabular-nums" aria-live="polite">
            Level {levelNo}
          </p>
          <button type="button" onClick={() => goTo(levelNo + 1)} disabled={levelNo >= mp.best} aria-label="Level berikutnya" className="grid size-11 place-items-center rounded-full disabled:opacity-25">
            <ChevronRight className="size-5" style={{ color: pal.soft }} />
          </button>
        </div>
        <button type="button" onClick={restart} disabled={solved} aria-label="Ulangi level" className="grid size-12 place-items-center rounded-full disabled:opacity-0">
          <RotateCcw className="size-5" style={{ color: pal.soft }} />
        </button>
      </header>

      <p className="text-center text-sm font-semibold" style={{ color: pal.soft }}>
        {goal}
      </p>

      <div
        ref={boxRef}
        className="relative flex min-h-0 flex-1 items-center justify-center p-6"
        onPointerDown={() => solved && next()}
      >
        {width > 0 && (
          <svg
            key={`${mode}-${levelNo}`}
            width={width}
            height={height}
            viewBox={`-6 -6 ${level.cols * CELL + 12} ${level.rows * CELL + 12}`}
            className={solved ? 'solved-pulse' : 'board-in'}
            role="group"
            aria-label={`Papan ${level.cols} kali ${level.rows}`}
          >
            {level.tiles.map((t, i) => (
              <Tile
                key={i}
                index={i}
                x={(i % level.cols) * CELL}
                y={Math.floor(i / level.cols) * CELL}
                base={t}
                turns={turns[i] ?? 0}
                color={solved ? pal.done : pal.ink}
                stroke={STROKE}
                disabled={solved}
                label={`Kepingan baris ${Math.floor(i / level.cols) + 1} kolom ${(i % level.cols) + 1}`}
                onTurn={turn}
              />
            ))}
          </svg>
        )}
      </div>

      <div className="flex h-20 items-start justify-center px-6">
        {solved ? (
          <button type="button" onClick={next} className="fade-up rounded-full px-6 py-3 text-base font-bold" style={{ color: pal.done }}>
            Tenang. Ketuk untuk lanjut →
          </button>
        ) : (
          <p className="text-xs" style={{ color: pal.soft, opacity: 0.8 }}>
            Ketuk kepingan untuk memutarnya
          </p>
        )}
      </div>
    </div>
  )
}
