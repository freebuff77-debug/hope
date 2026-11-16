import Dexie, { type EntityTable } from 'dexie'
import type { Budget, Category, Goal, Photo, Recurring, Transaction, Wallet } from '../types'

export interface SettingRow {
  key: string
  value: unknown
}

export class KantongDB extends Dexie {
  wallets!: EntityTable<Wallet, 'id'>
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  photos!: EntityTable<Photo, 'id'>
  budgets!: EntityTable<Budget, 'id'>
  recurring!: EntityTable<Recurring, 'id'>
  goals!: EntityTable<Goal, 'id'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'kantong') {
    super(name)
    this.version(1).stores({
      wallets: 'id, order',
      categories: 'id, type, order',
      transactions: 'id, date, walletId, toWalletId, categoryId, type, recurringId',
      photos: 'id',
      budgets: 'id',
      recurring: 'id',
      goals: 'id',
      settings: 'key',
    })
  }
}

export const db = new KantongDB()

export const uid = () => crypto.randomUUID()
