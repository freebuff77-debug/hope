import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { ensureSeeded, processRecurring } from './db/actions'
import { DEFAULT_SETTINGS, type Budget, type Category, type Goal, type Recurring, type Settings, type Transaction, type Wallet } from './types'
import { walletBalances, type Ctx } from './lib/finance'

export interface AppData extends Ctx {
  wallets: Wallet[]
  activeWallets: Wallet[]
  categories: Category[]
  transactions: Transaction[] // newest first
  budgets: Budget[]
  recurring: Recurring[]
  goals: Goal[]
  settings: Settings
  balances: Map<string, number>
}

const DataContext = createContext<AppData | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    ensureSeeded().then(() => processRecurring())
    const onVisible = () => document.visibilityState === 'visible' && processRecurring()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const wallets = useLiveQuery(() => db.wallets.orderBy('order').toArray())
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray())
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray())
  const budgets = useLiveQuery(() => db.budgets.toArray())
  const recurring = useLiveQuery(() => db.recurring.toArray())
  const goals = useLiveQuery(() => db.goals.toArray())
  const settingRows = useLiveQuery(() => db.settings.toArray())

  const settings = useMemo<Settings | undefined>(() => {
    if (!settingRows) return undefined
    const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
    for (const r of settingRows) out[r.key] = r.value
    return out as unknown as Settings
  }, [settingRows])

  useTheme(settings?.theme)

  const value = useMemo<AppData | null>(() => {
    if (!wallets || !categories || !transactions || !budgets || !recurring || !goals || !settings) return null
    return {
      wallets,
      activeWallets: wallets.filter((w) => !w.archived),
      categories,
      transactions,
      budgets,
      recurring,
      goals,
      settings,
      balances: walletBalances(wallets, transactions),
    }
  }, [wallets, categories, transactions, budgets, recurring, goals, settings])

  if (!value) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted" role="status">
        Memuat…
      </div>
    )
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): AppData {
  const v = useContext(DataContext)
  if (!v) throw new Error('useData outside DataProvider')
  return v
}

function useTheme(theme: Settings['theme'] | undefined) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme !== 'light' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1016' : '#0f766e')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
