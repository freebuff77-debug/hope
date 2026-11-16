import type { Budget, Category, Settings, Transaction, Wallet } from '../types'
import { convert } from './money'
import { addDays, addMonths, daysBetween, fromLocalISO, periodRange, toDateKey, toLocalISO, type Range } from './dates'

export interface Ctx {
  wallets: Wallet[]
  settings: Settings
}

function walletCurrency(ctx: Ctx, id: string | undefined): string {
  return ctx.wallets.find((w) => w.id === id)?.currency ?? ctx.settings.baseCurrency
}

/** Amount of a transaction in the base currency (transfers count as 0 for income/expense). */
export function inBase(ctx: Ctx, tx: Transaction): number {
  const { baseCurrency, rates } = ctx.settings
  return convert(tx.amount, walletCurrency(ctx, tx.walletId), baseCurrency, baseCurrency, rates)
}

export function walletBalances(wallets: Wallet[], txs: Transaction[]): Map<string, number> {
  const bal = new Map(wallets.map((w) => [w.id, w.initialBalance]))
  for (const t of txs) {
    if (t.type === 'income') bal.set(t.walletId, (bal.get(t.walletId) ?? 0) + t.amount)
    else if (t.type === 'expense') bal.set(t.walletId, (bal.get(t.walletId) ?? 0) - t.amount)
    else {
      bal.set(t.walletId, (bal.get(t.walletId) ?? 0) - t.amount)
      if (t.toWalletId) bal.set(t.toWalletId, (bal.get(t.toWalletId) ?? 0) + (t.toAmount ?? t.amount))
    }
  }
  return bal
}

export function totalBalance(ctx: Ctx, balances: Map<string, number>): number {
  const { baseCurrency, rates } = ctx.settings
  let sum = 0
  for (const w of ctx.wallets) {
    if (w.archived) continue
    sum += convert(balances.get(w.id) ?? 0, w.currency, baseCurrency, baseCurrency, rates)
  }
  return sum
}

export function inRange(txs: Transaction[], r: Range): Transaction[] {
  const from = toLocalISO(r.start)
  const to = toLocalISO(r.end)
  return txs.filter((t) => t.date >= from && t.date < to)
}

export interface Totals {
  income: number
  expense: number
  net: number
}

export function totals(ctx: Ctx, txs: Transaction[]): Totals {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += inBase(ctx, t)
    else if (t.type === 'expense') expense += inBase(ctx, t)
  }
  return { income, expense, net: income - expense }
}

export interface CategorySlice {
  categoryId: string | undefined
  amount: number
  count: number
  share: number // 0..1
}

export function byCategory(ctx: Ctx, txs: Transaction[], type: 'expense' | 'income'): CategorySlice[] {
  const map = new Map<string | undefined, { amount: number; count: number }>()
  let sum = 0
  for (const t of txs) {
    if (t.type !== type) continue
    const v = inBase(ctx, t)
    sum += v
    const cur = map.get(t.categoryId) ?? { amount: 0, count: 0 }
    cur.amount += v
    cur.count += 1
    map.set(t.categoryId, cur)
  }
  return [...map.entries()]
    .map(([categoryId, v]) => ({ categoryId, ...v, share: sum ? v.amount / sum : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

export interface Bucket {
  label: string
  start: Date
  income: number
  expense: number
}

/** Splits a range into day or month buckets for the trend chart. */
export function trend(ctx: Ctx, txs: Transaction[], r: Range, labelFn: (d: Date, unit: 'day' | 'month') => string): Bucket[] {
  const days = daysBetween(r.start, r.end)
  const unit: 'day' | 'month' = days > 62 ? 'month' : 'day'
  const buckets: Bucket[] = []
  for (let d = r.start; d < r.end; d = unit === 'day' ? addDays(d, 1) : addMonths(d, 1, 1)) {
    buckets.push({ label: labelFn(d, unit), start: d, income: 0, expense: 0 })
  }
  const keyOf = (d: Date) => (unit === 'day' ? toDateKey(d) : `${d.getFullYear()}-${d.getMonth()}`)
  const index = new Map(buckets.map((b, i) => [keyOf(b.start), i]))
  for (const t of inRange(txs, r)) {
    if (t.type === 'transfer') continue
    const i = index.get(keyOf(fromLocalISO(t.date)))
    if (i === undefined) continue
    if (t.type === 'income') buckets[i].income += inBase(ctx, t)
    else buckets[i].expense += inBase(ctx, t)
  }
  return buckets
}

export interface BudgetStatus {
  budget: Budget
  range: Range
  spent: number
  remaining: number
  ratio: number // spent / amount
  perDayLeft: number | null // what can still be spent per remaining day
  daysLeft: number
}

export function budgetStatus(ctx: Ctx, budget: Budget, txs: Transaction[], now: Date): BudgetStatus {
  const range = periodRange(budget.period, now, ctx.settings.weekStart)
  const cats = new Set(budget.categoryIds)
  let spent = 0
  for (const t of inRange(txs, range)) {
    if (t.type !== 'expense') continue
    if (cats.size && !(t.categoryId && cats.has(t.categoryId))) continue
    spent += inBase(ctx, t)
  }
  const remaining = budget.amount - spent
  const daysLeft = Math.max(1, daysBetween(now, range.end))
  return {
    budget,
    range,
    spent,
    remaining,
    ratio: budget.amount > 0 ? spent / budget.amount : 0,
    perDayLeft: budget.period === 'daily' ? null : Math.max(0, Math.floor(remaining / daysLeft)),
    daysLeft,
  }
}

export function categoryName(cats: Category[], id: string | undefined): string {
  return cats.find((c) => c.id === id)?.name ?? 'Tanpa kategori'
}
