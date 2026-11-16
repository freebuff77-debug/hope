import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { deleteCategory, deleteWallet, ensureSeeded, exportBackup, importBackup, payBill, processRecurring, saveRecurring, saveTransaction } from './actions'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await ensureSeeded()
})

describe('db actions', () => {
  it('seeds once', async () => {
    const n = await db.categories.count()
    await ensureSeeded()
    expect(await db.categories.count()).toBe(n)
    expect(await db.wallets.count()).toBe(2)
  })

  it('auto-records due recurring transactions exactly once', async () => {
    const [w] = await db.wallets.toArray()
    await saveRecurring({ name: 'Netflix', type: 'expense', amount: 54000, walletId: w.id, note: '', frequency: 'monthly', interval: 1, startDate: '2025-01-15T09:00', autoAdd: true })
    const now = new Date(2025, 3, 20)
    expect(await processRecurring(now)).toBe(4)
    expect(await processRecurring(now)).toBe(0)
    const txs = await db.transactions.orderBy('date').toArray()
    expect(txs.map((t) => t.date)).toEqual(['2025-01-15T09:00', '2025-02-15T09:00', '2025-03-15T09:00', '2025-04-15T09:00'])
  })

  it('bills wait for Bayar instead of auto-recording', async () => {
    const [w] = await db.wallets.toArray()
    const id = await saveRecurring({ name: 'Listrik', type: 'expense', amount: 300000, walletId: w.id, note: '', frequency: 'monthly', interval: 1, startDate: '2025-01-05T09:00', autoAdd: false })
    expect(await processRecurring(new Date(2025, 5, 1))).toBe(0)
    await payBill((await db.recurring.get(id))!, '2025-01-06T10:00')
    expect(await db.transactions.count()).toBe(1)
    expect((await db.recurring.get(id))!.count).toBe(1)
  })

  it('deleting a category keeps its transactions uncategorised', async () => {
    const [w] = await db.wallets.toArray()
    const cat = (await db.categories.where('type').equals('expense').first())!
    const id = await saveTransaction({ type: 'expense', amount: 1000, walletId: w.id, categoryId: cat.id, date: '2025-01-01T10:00', note: '' })
    await deleteCategory(cat.id)
    const tx = await db.transactions.get(id)
    expect(tx?.amount).toBe(1000)
    expect(tx?.categoryId).toBeUndefined()
  })

  it('deleting a wallet removes its transactions and photos', async () => {
    const [a, b] = await db.wallets.toArray()
    await saveTransaction({ type: 'expense', amount: 1000, walletId: a.id, date: '2025-01-01T10:00', note: '' }, [new Blob(['x'], { type: 'image/jpeg' })])
    await saveTransaction({ type: 'transfer', amount: 500, walletId: b.id, toWalletId: a.id, toAmount: 500, date: '2025-01-01T11:00', note: '' })
    await saveTransaction({ type: 'income', amount: 700, walletId: b.id, date: '2025-01-01T12:00', note: '' })
    await deleteWallet(a.id)
    expect(await db.transactions.count()).toBe(1)
    expect(await db.photos.count()).toBe(0)
  })

  it('backup round-trips everything including photos', async () => {
    const [w] = await db.wallets.toArray()
    await saveTransaction({ type: 'expense', amount: 1234, walletId: w.id, date: '2025-02-01T10:00', note: 'struk' }, [new Blob(['hello'], { type: 'image/png' })])
    const json = await exportBackup()
    await Promise.all(db.tables.map((t) => t.clear()))
    await importBackup(json)
    const [tx] = await db.transactions.toArray()
    expect(tx.note).toBe('struk')
    const photo = await db.photos.get(tx.photoIds[0])
    expect(await photo!.blob.text()).toBe('hello')
    await expect(importBackup('{"foo":1}')).rejects.toThrow('bukan cadangan Maalun')
    await expect(importBackup('not json')).rejects.toThrow('bukan cadangan Maalun')
  })

  it('restores backups made before the rename (kantong-backup)', async () => {
    const legacy = JSON.parse(await exportBackup())
    expect(legacy.format).toBe('maalun-backup')
    legacy.format = 'kantong-backup'
    legacy.transactions = [{ id: 't1', type: 'income', amount: 5, walletId: legacy.wallets[0].id, date: '2025-01-01T10:00', note: 'lama', photoIds: [], createdAt: 0 }]
    await importBackup(JSON.stringify(legacy))
    expect((await db.transactions.get('t1'))?.note).toBe('lama')
  })
})
