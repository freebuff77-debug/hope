import { Volume2, VolumeX, Vibrate, VibrateOff } from 'lucide-react'
import type { Mode } from '../game/puzzle'
import { tilePath } from '../game/Tile'
import { E, N, S, W } from '../game/puzzle'
import type { Progress } from '../storage'

interface Props {
  progress: Progress
  onPlay: (mode: Mode) => void
  onSettings: (patch: Partial<Progress['settings']>) => void
}

/** Tiny solved loop drawn with the same pieces as the game. */
export const RING = [E | S, E | W, S | W, N | S, 0, N | S, N | E, E | W, N | W]

function MiniLoop({ color }: { color: string }) {
  return (
    <svg viewBox="-8 -8 316 316" className="size-24" aria-hidden>
      {RING.map((m, i) => {
        const { d } = tilePath(m)
        return d ? <path key={i} transform={`translate(${(i % 3) * 100} ${Math.floor(i / 3) * 100})`} d={d} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" /> : null
      })}
      <circle cx="150" cy="150" r="17" fill="none" stroke={color} strokeWidth="12" />
    </svg>
  )
}

export default function Home({ progress, onPlay, onSettings }: Props) {
  const { sound, haptics } = progress.settings
  return (
    <main className="safe flex min-h-dvh flex-col items-center px-6 text-[#3e5a50]">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 pt-10 text-center">
        <img src="./logo.png" alt="" width={96} height={96} className="size-24 rounded-[26px] shadow-lg shadow-[#3e5a50]/15" />
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight">Calm</h1>
        <p className="text-base text-[#6b8279]">Putar. Sambungkan. Tenang.</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3 pb-6">
        <button
          type="button"
          onClick={() => onPlay('calm')}
          className="fade-up flex items-center gap-4 rounded-3xl bg-white/70 p-5 text-left shadow-sm ring-1 ring-[#3e5a50]/10 active:scale-[.98]"
        >
          <MiniLoop color="#3e5a50" />
          <span className="flex-1">
            <span className="block text-xl font-extrabold">Terang</span>
            <span className="block text-sm text-[#6b8279]">Sambungkan semua garis</span>
            <span className="mt-2 inline-block rounded-full bg-[#3e5a50]/8 px-3 py-1 text-sm font-bold">Level {progress.calm.level}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPlay('dusk')}
          className="fade-up flex items-center gap-4 rounded-3xl bg-[#121822] p-5 text-left text-[#c3cee0] shadow-sm active:scale-[.98]"
          style={{ animationDelay: '80ms' }}
        >
          <svg viewBox="-8 -8 316 316" className="size-24" aria-hidden>
            {[W, N, E, S, W, N, E, S, W].map((m, i) => {
              const { d, ring } = tilePath(m)
              return (
                <g key={i} transform={`translate(${(i % 3) * 100} ${Math.floor(i / 3) * 100})`}>
                  <path d={d} fill="none" stroke="#c3cee0" strokeWidth="12" strokeLinecap="round" />
                  {ring && <circle cx="50" cy="50" r="17" fill="none" stroke="#c3cee0" strokeWidth="12" />}
                </g>
              )
            })}
          </svg>
          <span className="flex-1">
            <span className="block text-xl font-extrabold">Gelap</span>
            <span className="block text-sm text-[#7d889b]">Putuskan semua sambungan</span>
            <span className="mt-2 inline-block rounded-full bg-white/8 px-3 py-1 text-sm font-bold">Level {progress.dusk.level}</span>
          </span>
        </button>

        <div className="mt-2 flex justify-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={sound}
            onClick={() => onSettings({ sound: !sound })}
            className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#6b8279] ring-1 ring-[#3e5a50]/15"
          >
            {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} Suara {sound ? 'nyala' : 'mati'}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={haptics}
            onClick={() => onSettings({ haptics: !haptics })}
            className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#6b8279] ring-1 ring-[#3e5a50]/15"
          >
            {haptics ? <Vibrate className="size-4" /> : <VibrateOff className="size-4" />} Getar {haptics ? 'nyala' : 'mati'}
          </button>
        </div>
        <p className="pt-2 text-center text-xs text-[#6b8279]/80">
          Level tanpa batas · gratis · tanpa iklan · v{__APP_VERSION__}
        </p>
      </div>
    </main>
  )
}
