import { describe, expect, it } from 'vitest'
import { convert, formatMoney, parseAmount } from './money'
import { addMonths, periodRange, toLocalISO } from './dates'
import { dueOccurrences, occurrence } from './recurring'
import { budgetStatus, byCategory, totals, walletBalances } from './finance'
import type { Recurring, Transaction, Wallet } from '../types'
import { DEFAULT_SETTINGS } from '../types'

describe('money', () => {
  it('parses Indonesian and international input', () => {
    expect(parseAmount('12.500', 'IDR')).toBe(12500)
    expect(parseAmount('1.250.000', 'IDR')).toBe(1250000)
    expect(parseAmount('12,50', 'USD')).toBe(1250)
    expect(parseAmount('12.5', 'USD')).toBe(1250)
    expect(parseAmount('1.234,56', 'EUR')).toBe(123456)
    expect(parseAmount('1,234.56', 'USD')).toBe(123456)
    expect(parseAmount('1.000', 'USD')).toBe(100000)
    expect(parseAmount('', 'IDR')).toBeNull()
  })

  it('formats with sign', () => {
    expect(formatMoney(1250000, 'IDR').replace(/\s/g, ' ')).toBe('Rp 1.250.000')
    expect(formatMoney(-500, 'IDR')).toMatch(/^−Rp/)
    expect(formatMoney(1250, 'USD', { sign: true })).toMatch(/^\+US\$/)
  })

  it('converts through user rates', () => {
    // 1 USD = 16 000 IDR; 10.00 USD -> 160 000 IDR
    expect(convert(1000, 'USD', 'IDR', 'IDR', { USD: 16000 })).toBe(160000)
    expect(convert(160000, 'IDR', 'USD', 'IDR', { USD: 16000 })).toBe(1000)
    expect(convert(500, 'IDR', 'IDR', 'IDR', {})).toBe(500)
  })
})

describe('dates', () => {
  it('clamps month ends without drifting', () => {
    const jan31 = new Date(2025, 0, 31)
    expect(addMonths(jan31, 1).getDate()).toBe(28)
    expect(addMonths(jan31, 2).getDate()).toBe(31)
    expect(addMonths(new Date(2024, 0, 31), 1).getDate()).toBe(29)
  })

  it('computes week ranges from Monday', () => {
    const r = periodRange('weekly', new Date(2025, 5, 4), 1) // Wed 4 Jun 2025
    expect(r.start).toEqual(new Date(2025, 5, 2))
    expect(r.end).toEqual(new Date(2025, 5, 9))
  })
})

const rec = (over: Partial<Recurring> = {}): Recurring => ({
  id: 'r', name: 'Kos', type: 'expense', amount: 1000, walletId: 'w', note: '', frequency: 'monthly', interval: 1,
  startDate: '2025-01-31T09:00', count: 0, autoAdd: true, active: true, createdAt: 0, ...over,
})

describe('recurring', () => {
  it('lists every missed occurrence up to now', () => {
    const due = dueOccurrences(rec(), new Date(2025, 3, 1, 12))
    expect(due.map((d) => d.date)).toEqual(['2025-01-31T09:00', '2025-02-28T09:00', '2025-03-31T09:00'])
  })

  it('respects count, interval and end date', () => {
    expect(dueOccurrences(rec({ count: 2 }), new Date(2025, 3, 1)).map((d) => d.index)).toEqual([2])
    expect(toLocalISO(occurrence(rec({ frequency: 'weekly', interval: 2, startDate: '2025-01-01T08:00' }), 1))).toBe('2025-01-15T08:00')
    expect(dueOccurrences(rec({ endDate: '2025-02-28' }), new Date(2025, 11, 1))).toHaveLength(2)
    expect(dueOccurrences(rec({ active: false }), new Date(2025, 11, 1))).toHaveLength(0)
  })
})

describe('finance', () => {
  const wallets: Wallet[] = [
    { id: 'cash', name: 'Tunai', currency: 'IDR', initialBalance: 100000, color: '', icon: '', archived: false, order: 0, createdAt: 0 },
    { id: 'usd', name: 'USD', currency: 'USD', initialBalance: 0, color: '', icon: '', archived: false, order: 1, createdAt: 0 },
  ]
  const tx = (o: Partial<Transaction>): Transaction => ({ id: Math.random().toString(), type: 'expense', amount: 0, walletId: 'cash', date: '2025-06-10T10:00', note: '', photoIds: [], createdAt: 0, ...o })
  const txs = [
    tx({ type: 'expense', amount: 20000, categoryId: 'food' }),
    tx({ type: 'expense', amount: 5000, categoryId: 'bus' }),
    tx({ type: 'income', amount: 50000, categoryId: 'salary' }),
    tx({ type: 'transfer', amount: 32000, toWalletId: 'usd', toAmount: 200 }),
    tx({ type: 'expense', amount: 100, walletId: 'usd', categoryId: 'food' }), // 1.00 USD
  ]
  const ctx = { wallets, settings: { ...DEFAULT_SETTINGS, rates: { USD: 16000 } } }

  it('balances include transfers in both currencies', () => {
    const b = walletBalances(wallets, txs)
    expect(b.get('cash')).toBe(100000 - 20000 - 5000 + 50000 - 32000)
    expect(b.get('usd')).toBe(200 - 100)
  })

  it('totals ignore transfers and convert currencies', () => {
    expect(totals(ctx, txs)).toEqual({ income: 50000, expense: 20000 + 5000 + 16000, net: 50000 - 41000 })
    const slices = byCategory(ctx, txs, 'expense')
    expect(slices[0]).toMatchObject({ categoryId: 'food', amount: 36000, count: 2 })
  })

  it('budget counts only its categories in the current period', () => {
    const s = budgetStatus(ctx, { id: 'b', name: 'Makan', period: 'monthly', amount: 30000, categoryIds: ['food'], createdAt: 0 }, txs, new Date(2025, 5, 20))
    expect(s.spent).toBe(36000)
    expect(s.remaining).toBe(-6000)
    expect(s.ratio).toBeCloseTo(1.2)
    const july = budgetStatus(ctx, { id: 'b', name: 'Semua', period: 'monthly', amount: 30000, categoryIds: [], createdAt: 0 }, txs, new Date(2025, 6, 1))
    expect(july.spent).toBe(0)
  })
})
