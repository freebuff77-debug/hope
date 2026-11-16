import { CalendarDays, Check, Flame, Vibrate, VibrateOff, Volume2, VolumeX } from 'lucide-react'
import { Board } from '../game/Board'
import { MODES, dailyMode, generate, type Level, type Mode } from '../game/puzzle'
import { MODE_INFO, paletteFor } from '../game/palette'
import { streak, type Progress } from '../storage'

interface Props {
  progress: Progress
  today: string
  onPlay: (mode: Mode) => void
  onDaily: () => void
  onSettings: (patch: Partial<Progress['settings']>) => void
}

// Solved level 1 of each mode, used as the card picture.
const PREVIEWS = Object.fromEntries(
  MODES.map((m) => {
    const l = generate(m, m === 'energy' ? 2 : 3)
    return [m, { ...l, tiles: l.solution } satisfies Level]
  }),
) as Record<Mode, Level>

export default function Home({ progress, today, onPlay, onDaily, onSettings }: Props) {
  const { sound, haptics } = progress.settings
  const dailyDone = progress.daily.done.includes(today)
  const days = streak(progress.daily.done, today)
  const todayMode = dailyMode(today)

  return (
    <main className="safe flex min-h-dvh flex-col items-center px-5 text-[#3e5a50]">
      <header className="flex w-full max-w-md items-center gap-3 pt-6 pb-4">
        <img src="./logo.png" alt="" width={52} height={52} className="size-13 rounded-2xl shadow-md shadow-[#3e5a50]/15" />
        <div>
          <h1 className="text-3xl leading-none font-extrabold tracking-tight">Calm</h1>
          <p className="mt-1 text-sm text-[#6b8279]">Putar. Sambungkan. Tenang.</p>
        </div>
      </header>

      <div className="flex w-full max-w-md flex-1 flex-col gap-3 pb-6">
        <button
          type="button"
          onClick={onDaily}
          className="fade-up flex items-center gap-4 rounded-3xl bg-white/75 p-4 text-left shadow-sm ring-1 ring-[#3e5a50]/10 active:scale-[.98]"
        >
          <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${dailyDone ? 'bg-[#24845f] text-white' : 'bg-[#3e5a50]/8'}`}>
            {dailyDone ? <Check className="size-7" aria-hidden /> : <CalendarDays className="size-7" aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-extrabold">Tantangan harian</span>
            <span className="block text-sm text-[#6b8279]">
              {dailyDone ? 'Selesai hari ini. Datang lagi besok!' : `Hari ini: ${MODE_INFO[todayMode].name}, papan besar`}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-center" aria-label={`${days} hari berturut-turut`}>
            <Flame className={`size-6 ${days ? 'text-[#d9822b]' : 'text-[#6b8279]/40'}`} aria-hidden />
            <span className="text-sm font-extrabold tabular-nums">{days}</span>
          </span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode, k) => {
            const pal = paletteFor(mode, 1)
            const info = MODE_INFO[mode]
            const preview = PREVIEWS[mode]
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onPlay(mode)}
                className="fade-up flex flex-col rounded-3xl p-4 text-left shadow-sm active:scale-[.98]"
                style={{ background: pal.bg, color: pal.dark ? '#e6ebf5' : pal.ink, animationDelay: `${60 + k * 50}ms`, boxShadow: pal.dark ? undefined : `inset 0 0 0 1px ${pal.ink}1a` }}
              >
                <span className="flex h-24 items-center justify-center">
                  <Board level={preview} ink={pal.done} done={pal.done} solved={mode !== 'energy'} className="h-full w-auto max-w-full" />
                </span>
                <span className="mt-3 block text-lg font-extrabold">{info.name}</span>
                <span className="block min-h-10 text-xs leading-tight" style={{ color: pal.soft }}>
                  {info.goal}
                </span>
                <span className="mt-2 self-start rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${pal.ink}14` }}>
                  Level {progress[mode].level}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-1 flex justify-center gap-2">
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
        <p className="text-center text-xs text-[#6b8279]/80">
          4 mode · level tanpa batas · petunjuk gratis · tanpa iklan · v{__APP_VERSION__}
        </p>
      </div>
    </main>
  )
}
