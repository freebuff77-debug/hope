import type { Category, Wallet } from '../types'

type Seed = Omit<Category, 'id' | 'order' | 'archived'>

const EXPENSE: Seed[] = [
  { name: 'Makan & Minum', type: 'expense', icon: 'utensils', color: '#f97316' },
  { name: 'Belanja Harian', type: 'expense', icon: 'cart', color: '#22c55e' },
  { name: 'Transportasi', type: 'expense', icon: 'bus', color: '#3b82f6' },
  { name: 'Bensin', type: 'expense', icon: 'fuel', color: '#64748b' },
  { name: 'Listrik & Air', type: 'expense', icon: 'zap', color: '#eab308' },
  { name: 'Pulsa & Internet', type: 'expense', icon: 'wifi', color: '#06b6d4' },
  { name: 'Rumah & Sewa', type: 'expense', icon: 'home', color: '#8b5cf6' },
  { name: 'Kesehatan', type: 'expense', icon: 'heart', color: '#ef4444' },
  { name: 'Pendidikan', type: 'expense', icon: 'school', color: '#6366f1' },
  { name: 'Hiburan', type: 'expense', icon: 'film', color: '#ec4899' },
  { name: 'Pakaian', type: 'expense', icon: 'shirt', color: '#d946ef' },
  { name: 'Hadiah & Donasi', type: 'expense', icon: 'gift', color: '#f43f5e' },
  { name: 'Anak', type: 'expense', icon: 'baby', color: '#f59e0b' },
  { name: 'Cicilan & Tagihan', type: 'expense', icon: 'receipt', color: '#78716c' },
  { name: 'Lainnya', type: 'expense', icon: 'package', color: '#94a3b8' },
]

const INCOME: Seed[] = [
  { name: 'Gaji', type: 'income', icon: 'briefcase', color: '#10b981' },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: '#14b8a6' },
  { name: 'Usaha', type: 'income', icon: 'store', color: '#0ea5e9' },
  { name: 'Investasi', type: 'income', icon: 'trending', color: '#84cc16' },
  { name: 'Bonus', type: 'income', icon: 'sparkles', color: '#eab308' },
  { name: 'Hadiah', type: 'income', icon: 'gift', color: '#ec4899' },
  { name: 'Lainnya', type: 'income', icon: 'coins', color: '#94a3b8' },
]

export function defaultCategories(makeId: () => string): Category[] {
  return [...EXPENSE, ...INCOME].map((c, i) => ({ ...c, id: makeId(), order: i, archived: false }))
}

export function defaultWallets(makeId: () => string, currency: string): Wallet[] {
  const now = Date.now()
  return [
    { id: makeId(), name: 'Tunai', currency, initialBalance: 0, color: '#0a47e0', icon: 'wallet', archived: false, order: 0, createdAt: now },
    { id: makeId(), name: 'Rekening Bank', currency, initialBalance: 0, color: '#3b82f6', icon: 'bank', archived: false, order: 1, createdAt: now },
  ]
}
