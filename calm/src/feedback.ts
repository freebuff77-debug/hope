import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, duration: number, volume: number, endFreq = freq) {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + start
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

/** Soft wooden tick for a turn. */
export function playTurn() {
  tone(520 + Math.random() * 60, 0, 0.09, 0.05, 380)
}

/** Gentle rising chord when a level is solved (pentatonic, so it never clashes). */
export function playSolved() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => tone(f, i * 0.09, 1.4, 0.05))
}

export async function buzz(strong = false) {
  if (isNative) {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: strong ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {})
  } else {
    navigator.vibrate?.(strong ? 25 : 6)
  }
}
