import { useCallback, useEffect, useRef, useState } from 'react'
import Home from './screens/Home'
import Game from './screens/Game'
import { HOME_PALETTE } from './game/palette'
import { loadProgress, saveProgress, type Progress } from './storage'
import { onBack, setSystemBars } from './native'
import type { Mode } from './game/puzzle'

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [mode, setMode] = useState<Mode | null>(null)

  const update = useCallback((p: Progress) => {
    setProgress(p)
    saveProgress(p)
  }, [])

  const applyPalette = useCallback((bg: string, ink: string, dark: boolean) => {
    const root = document.documentElement.style
    root.setProperty('--bg', bg)
    root.setProperty('--ink', ink)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
    void setSystemBars(dark)
  }, [])

  useEffect(() => {
    if (!mode) applyPalette(HOME_PALETTE.bg, HOME_PALETTE.ink, false)
  }, [mode, applyPalette])

  const modeRef = useRef(mode)
  modeRef.current = mode
  useEffect(() => {
    let off: (() => void) | undefined
    void onBack(() => {
      if (!modeRef.current) return false
      setMode(null)
      return true
    }).then((fn) => (off = fn))
    return () => off?.()
  }, [])

  if (!mode) {
    return <Home progress={progress} onPlay={setMode} onSettings={(s) => update({ ...progress, settings: { ...progress.settings, ...s } })} />
  }
  return <Game mode={mode} progress={progress} onProgress={update} onExit={() => setMode(null)} onPalette={applyPalette} />
}

