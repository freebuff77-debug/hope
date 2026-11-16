import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Home from './screens/Home'
import Game from './screens/Game'
import { HOME_PALETTE, MODE_INFO, paletteFor, type Palette } from './game/palette'
import { dailyLevel, generate, type Mode } from './game/puzzle'
import { dateKey, loadProgress, saveProgress, withMode, type Progress } from './storage'
import { onBack, setSystemBars } from './native'

type Screen = { kind: 'home' } | { kind: 'play'; mode: Mode } | { kind: 'daily'; date: string }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const shortDate = (key: string) => {
  const [, m, d] = key.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [today, setToday] = useState(dateKey)

  // Keep the latest progress for callbacks that outlive a render.
  const progressRef = useRef(progress)
  progressRef.current = progress
  const update = useCallback((fn: (p: Progress) => Progress) => {
    const next = fn(progressRef.current)
    progressRef.current = next
    setProgress(next)
    saveProgress(next)
  }, [])

  const applyPalette = useCallback((p: Palette) => {
    const root = document.documentElement.style
    root.setProperty('--bg', p.bg)
    root.setProperty('--ink', p.ink)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg)
    void setSystemBars(p.dark)
  }, [])

  useEffect(() => {
    if (screen.kind === 'home') {
      applyPalette(HOME_PALETTE)
      setToday(dateKey())
    }
  }, [screen, applyPalette])

  const screenRef = useRef(screen)
  screenRef.current = screen
  useEffect(() => {
    let off: (() => void) | undefined
    void onBack(() => {
      if (screenRef.current.kind === 'home') return false
      setScreen({ kind: 'home' })
      return true
    }).then((fn) => (off = fn))
    return () => off?.()
  }, [])

  const mode = screen.kind === 'play' ? screen.mode : null
  const levelNo = mode ? progress[mode].level : 0
  const level = useMemo(() => {
    if (screen.kind === 'daily') return dailyLevel(screen.date)
    return mode ? generate(mode, levelNo) : null
  }, [screen, mode, levelNo])

  const onTurns = useCallback(
    (turns: number[] | undefined) => {
      const s = screenRef.current
      if (s.kind === 'play') update((p) => withMode(p, s.mode, { turns }))
      else if (s.kind === 'daily') update((p) => ({ ...p, daily: { ...p.daily, date: s.date, turns } }))
    },
    [update],
  )

  const onSolved = useCallback(() => {
    const s = screenRef.current
    if (s.kind === 'play') {
      update((p) => withMode(p, s.mode, { best: Math.max(p[s.mode].best, p[s.mode].level + 1), turns: undefined }))
    } else if (s.kind === 'daily') {
      update((p) => ({ ...p, daily: { done: [...new Set([...p.daily.done, s.date])].slice(-400) } }))
    }
  }, [update])

  if (screen.kind === 'home' || !level) {
    return (
      <Home
        progress={progress}
        today={today}
        onPlay={(m) => setScreen({ kind: 'play', mode: m })}
        onDaily={() => setScreen({ kind: 'daily', date: dateKey() })}
        onSettings={(s) => update((p) => ({ ...p, settings: { ...p.settings, ...s } }))}
      />
    )
  }

  const goHome = () => setScreen({ kind: 'home' })

  if (screen.kind === 'daily') {
    const d = progress.daily
    return (
      <Game
        key={`daily-${screen.date}`}
        level={level}
        palette={paletteFor(level.mode, level.number)}
        title={`Harian · ${shortDate(screen.date)}`}
        goal={MODE_INFO[level.mode].goal}
        initialTurns={d.date === screen.date ? d.turns : undefined}
        settings={progress.settings}
        doneLabel="Selesai! Kembali ke menu →"
        onTurns={onTurns}
        onSolved={onSolved}
        onNext={goHome}
        onExit={goHome}
        onPalette={applyPalette}
      />
    )
  }

  const m = screen.mode
  const mp = progress[m]
  const goTo = (n: number) => {
    if (n < 1 || n > progressRef.current[m].best) return
    update((p) => withMode(p, m, { level: n, turns: undefined }))
  }
  return (
    <Game
      key={`${m}-${mp.level}`}
      level={level}
      palette={paletteFor(m, mp.level)}
      title={`Level ${mp.level}`}
      goal={MODE_INFO[m].goal}
      initialTurns={mp.turns}
      settings={progress.settings}
      canPrev={mp.level > 1}
      canNext={mp.level < mp.best}
      doneLabel="Tenang. Ketuk untuk lanjut →"
      onTurns={onTurns}
      onSolved={onSolved}
      onPrev={() => goTo(mp.level - 1)}
      onNext={() => goTo(mp.level + 1)}
      onExit={goHome}
      onPalette={applyPalette}
    />
  )
}
