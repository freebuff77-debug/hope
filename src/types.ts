import type { Period } from './lib/dates'

export type TxType = 'expense' | 'income' | 'transfer'
export type CategoryType = 'expense' | 'income'

export interface Wallet {
  id: string
  name: string
  currency: string
  initialBalance: number // minor units
  color: string
  icon: string
  archived: boolean
  order: number
  createdAt: number
}

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  order: number
  archived: boolean
}

export interface Transaction {
  id: string
  type: TxType
  amount: number // minor units, in the source wallet's currency
  walletId: string
  toWalletId?: string
  toAmount?: number // minor units in the target wallet's currency (transfers)
  categoryId?: string
  date: string // local "YYYY-MM-DDTHH:mm"
  note: string
  photoIds: string[]
  recurringId?: string
  createdAt: number
}

export interface Photo {
  id: string
  blob: Blob
}

export interface Budget {
  id: string
  name: string
  period: Period
  amount: number // minor units in base currency
  categoryIds: string[] // empty = every expense category
  createdAt: number
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Recurring {
  id: string
  name: string
  type: TxType
  amount: number
  walletId: string
  toWalletId?: string
  toAmount?: number
  categoryId?: string
  note: string
  frequency: Frequency
  interval: number
  startDate: string // local ISO, first occurrence
  count: number // occurrences already recorded or skipped
  endDate?: string // local date "YYYY-MM-DD", inclusive
  autoAdd: boolean // true: recorded automatically; false: bill waiting for "Bayar"
  active: boolean
  createdAt: number
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  currency: string
  deadline?: string // "YYYY-MM-DD"
  color: string
  icon: string
  createdAt: number
}

export interface Settings {
  baseCurrency: string
  rates: Record<string, number>
  theme: 'system' | 'light' | 'dark'
  weekStart: 0 | 1
  onboarded: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  baseCurrency: 'IDR',
  rates: {},
  theme: 'system',
  weekStart: 1,
  onboarded: false,
}
