import { db, uid, type SettingRow } from './db'
import { defaultCategories, defaultWallets } from './seed'
import { DEFAULT_SETTINGS, type Budget, type Category, type Goal, type Recurring, type Settings, type Transaction, type Wallet } from '../types'
import { dueOccurrences } from '../lib/recurring'
import { toDateKey } from '../lib/dates'
import { toMajor } from '../lib/money'

export { uid }

// ---------- settings ----------

export async function loadSettings(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const r of rows) out[r.key] = r.value
  return out as unknown as Settings
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value })
}

/** First run: default categories and wallets. Safe to call on every start. */
export async function ensureSeeded(currency = DEFAULT_SETTINGS.baseCurrency) {
  await db.transaction('rw', db.categories, db.wallets, db.settings, async () => {
    const seeded = await db.settings.get('seeded')
    if (seeded?.value) return
    if ((await db.categories.count()) === 0) await db.categories.bulkAdd(defaultCategories(uid))
    if ((await db.wallets.count()) === 0) await db.wallets.bulkAdd(defaultWallets(uid, currency))
    await db.settings.bulkPut([
      { key: 'seeded', value: true },
      { key: 'baseCurrency', value: currency },
    ])
  })
}

// ---------- transactions ----------

export type TxInput = Omit<Transaction, 'id' | 'createdAt' | 'photoIds'> & { id?: string; photoIds?: string[] }

export async function saveTransaction(input: TxInput, newPhotos: Blob[] = [], removedPhotoIds: string[] = []): Promise<string> {
  return db.transaction('rw', db.transactions, db.photos, async () => {
    const existing = input.id ? await db.transactions.get(input.id) : undefined
    const added = newPhotos.map((blob) => ({ id: uid(), blob }))
    if (added.length) await db.photos.bulkAdd(added)
    if (removedPhotoIds.length) await db.photos.bulkDelete(removedPhotoIds)
    const kept = (input.photoIds ?? existing?.photoIds ?? []).filter((p) => !removedPhotoIds.includes(p))
    const tx: Transaction = {
      ...input,
      id: existing?.id ?? uid(),
      createdAt: existing?.createdAt ?? Date.now(),
      photoIds: [...kept, ...added.map((p) => p.id)],
      categoryId: input.type === 'transfer' ? undefined : input.categoryId,
      toWalletId: input.type === 'transfer' ? input.toWalletId : undefined,
      toAmount: input.type === 'transfer' ? input.toAmount : undefined,
    }
    await db.transactions.put(tx)
    return tx.id
  })
}

export async function deleteTransaction(id: string) {
  await db.transaction('rw', db.transactions, db.photos, async () => {
    const tx = await db.transactions.get(id)
    if (!tx) return
    if (tx.photoIds.length) await db.photos.bulkDelete(tx.photoIds)
    await db.transactions.delete(id)
  })
}

// ---------- wallets ----------

export async function saveWallet(w: Omit<Wallet, 'id' | 'createdAt' | 'order'> & { id?: string }) {
  const existing = w.id ? await db.wallets.get(w.id) : undefined
  const order = existing?.order ?? (await db.wallets.count())
  const row: Wallet = { ...w, id: existing?.id ?? uid(), order, createdAt: existing?.createdAt ?? Date.now() }
  await db.wallets.put(row)
  return row.id
}

export async function deleteWallet(id: string) {
  await db.transaction('rw', [db.wallets, db.transactions, db.photos, db.recurring], async () => {
    const txs = await db.transactions.filter((t) => t.walletId === id || t.toWalletId === id).toArray()
    await db.photos.bulkDelete(txs.flatMap((t) => t.photoIds))
    await db.transactions.bulkDelete(txs.map((t) => t.id))
    await db.recurring.filter((r) => r.walletId === id || r.toWalletId === id).delete()
    await db.wallets.delete(id)
  })
}

// ---------- categories ----------

export async function saveCategory(c: Omit<Category, 'id' | 'order' | 'archived'> & { id?: string }) {
  const existing = c.id ? await db.categories.get(c.id) : undefined
  const order = existing?.order ?? (await db.categories.count())
  const row: Category = { ...c, id: existing?.id ?? uid(), order, archived: existing?.archived ?? false }
  await db.categories.put(row)
  return row.id
}

/** Transactions keep their amount and show as "Tanpa kategori". */
export async function deleteCategory(id: string) {
  await db.transaction('rw', [db.categories, db.transactions, db.budgets, db.recurring], async () => {
    await db.transactions.where('categoryId').equals(id).modify((t) => {
      delete t.categoryId
    })
    await db.budgets.toCollection().modify((b) => {
      b.categoryIds = b.categoryIds.filter((c) => c !== id)
    })
    await db.recurring.filter((r) => r.categoryId === id).modify((r) => {
      delete r.categoryId
    })
    await db.categories.delete(id)
  })
}

// ---------- budgets ----------

export async function saveBudget(b: Omit<Budget, 'id' | 'createdAt'> & { id?: string }) {
  const existing = b.id ? await db.budgets.get(b.id) : undefined
  const row: Budget = { ...b, id: existing?.id ?? uid(), createdAt: existing?.createdAt ?? Date.now() }
  await db.budgets.put(row)
  return row.id
}

export const deleteBudget = (id: string) => db.budgets.delete(id)

// ---------- recurring / bills ----------

export async function saveRecurring(r: Omit<Recurring, 'id' | 'createdAt' | 'count' | 'active'> & { id?: string; count?: number; active?: boolean }) {
  const existing = r.id ? await db.recurring.get(r.id) : undefined
  const scheduleChanged = existing && (existing.startDate !== r.startDate || existing.frequency !== r.frequency || existing.interval !== r.interval)
  const row: Recurring = {
    ...r,
    id: existing?.id ?? uid(),
    createdAt: existing?.createdAt ?? Date.now(),
    count: scheduleChanged ? 0 : (r.count ?? existing?.count ?? 0),
    active: r.active ?? existing?.active ?? true,
  }
  await db.recurring.put(row)
  return row.id
}

export const deleteRecurring = (id: string) => db.recurring.delete(id)

function txFromRecurring(r: Recurring, date: string): TxInput {
  return {
    type: r.type,
    amount: r.amount,
    walletId: r.walletId,
    toWalletId: r.toWalletId,
    toAmount: r.toAmount,
    categoryId: r.categoryId,
    note: r.note || r.name,
    date,
    recurringId: r.id,
  }
}

/** Records every due occurrence of auto-add schedules. Returns how many transactions were created. */
export async function processRecurring(now = new Date()): Promise<number> {
  let created = 0
  const all = await db.recurring.filter((r) => r.active && r.autoAdd).toArray()
  for (const r of all) {
    const due = dueOccurrences(r, now)
    if (!due.length) continue
    await db.transaction('rw', db.recurring, db.transactions, db.photos, async () => {
      const fresh = await db.recurring.get(r.id)
      if (!fresh || fresh.count !== r.count) return // another tab got here first
      for (const o of due) await saveTransaction(txFromRecurring(r, o.date))
      await db.recurring.update(r.id, { count: r.count + due.length })
      created += due.length
    })
  }
  return created
}

/** Bill paid: records the transaction (dated now, or on the due date if given) and moves to the next one. */
export async function payBill(r: Recurring, date: string) {
  await db.transaction('rw', db.recurring, db.transactions, db.photos, async () => {
    await saveTransaction(txFromRecurring(r, date))
    await db.recurring.update(r.id, { count: r.count + 1 })
  })
}

export const skipBill = (r: Recurring) => db.recurring.update(r.id, { count: r.count + 1 })

// ---------- goals ----------

export async function saveGoal(g: Omit<Goal, 'id' | 'createdAt'> & { id?: string }) {
  const existing = g.id ? await db.goals.get(g.id) : undefined
  const row: Goal = { ...g, id: existing?.id ?? uid(), createdAt: existing?.createdAt ?? Date.now() }
  await db.goals.put(row)
  return row.id
}

export const deleteGoal = (id: string) => db.goals.delete(id)

export async function addToGoal(id: string, delta: number) {
  await db.goals.where('id').equals(id).modify((g) => {
    g.saved = Math.max(0, g.saved + delta)
  })
}

// ---------- backup ----------

const BACKUP_FORMAT = 'maalun-backup'
// Files made before the rename to Maalun still restore.
const ACCEPTED_FORMATS = [BACKUP_FORMAT, 'kantong-backup']

async function blobToDataURL(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`
}

function dataURLToBlob(url: string): Blob {
  const [head, data] = url.split(',')
  const type = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream'
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

export async function exportBackup(): Promise<string> {
  const [wallets, categories, transactions, budgets, recurring, goals, settings, photos] = await Promise.all([
    db.wallets.toArray(), db.categories.toArray(), db.transactions.toArray(), db.budgets.toArray(),
    db.recurring.toArray(), db.goals.toArray(), db.settings.toArray(), db.photos.toArray(),
  ])
  const photoData = await Promise.all(photos.map(async (p) => ({ id: p.id, data: await blobToDataURL(p.blob) })))
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    wallets, categories, transactions, budgets, recurring, goals, settings, photos: photoData,
  })
}

export async function importBackup(json: string) {
  let data
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('File ini bukan cadangan Maalun.')
  }
  if (!ACCEPTED_FORMATS.includes(data?.format) || !Array.isArray(data.transactions)) {
    throw new Error('File ini bukan cadangan Maalun.')
  }
  const photos = (data.photos ?? []).map((p: { id: string; data: string }) => ({ id: p.id, blob: dataURLToBlob(p.data) }))
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await db.wallets.bulkAdd(data.wallets ?? [])
    await db.categories.bulkAdd(data.categories ?? [])
    await db.transactions.bulkAdd(data.transactions)
    await db.budgets.bulkAdd(data.budgets ?? [])
    await db.recurring.bulkAdd(data.recurring ?? [])
    await db.goals.bulkAdd(data.goals ?? [])
    await db.settings.bulkAdd((data.settings ?? []) as SettingRow[])
    await db.photos.bulkAdd(photos)
  })
}

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function exportCSV(): Promise<string> {
  const [txs, wallets, cats] = await Promise.all([db.transactions.orderBy('date').toArray(), db.wallets.toArray(), db.categories.toArray()])
  const wName = (id?: string) => wallets.find((w) => w.id === id)?.name ?? ''
  const wCur = (id?: string) => wallets.find((w) => w.id === id)?.currency ?? ''

  const TYPE = { expense: 'Pengeluaran', income: 'Pemasukan', transfer: 'Transfer' }
  const rows = [['Tanggal', 'Jam', 'Jenis', 'Kategori', 'Dompet', 'Ke dompet', 'Jumlah', 'Mata uang', 'Jumlah diterima', 'Catatan']]
  for (const t of txs) {
    const [d, time] = t.date.split('T')
    rows.push([
      d, time, TYPE[t.type], cats.find((c) => c.id === t.categoryId)?.name ?? '', wName(t.walletId), wName(t.toWalletId),
      String(toMajor(t.amount, wCur(t.walletId))), wCur(t.walletId),
      t.toAmount !== undefined ? String(toMajor(t.toAmount, wCur(t.toWalletId))) : '', t.note,
    ])
  }
  return '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\n')
}

export async function resetAll() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
}

export const todayKey = () => toDateKey(new Date())
