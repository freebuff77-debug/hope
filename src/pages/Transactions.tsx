import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SearchX, Wallet } from 'lucide-react'
import { useData } from '../state'
import { Card, Empty, Input, Money, PageHeader, Select, cx } from '../components/ui'
import { TxGroups } from '../components/TxRow'
import { totals } from '../lib/finance'
import type { TxType } from '../types'

const PAGE = 100

export default function Transactions() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const type = (params.get('jenis') ?? 'all') as TxType | 'all'
  const walletId = params.get('dompet') ?? ''
  const categoryId = params.get('kategori') ?? ''
  const month = params.get('bulan') ?? '' // "YYYY-MM"

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value && value !== 'all') next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    setLimit(PAGE)
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const catName = new Map(data.categories.map((c) => [c.id, c.name.toLowerCase()]))
    return data.transactions.filter((t) => {
      if (type !== 'all' && t.type !== type) return false
      if (walletId && t.walletId !== walletId && t.toWalletId !== walletId) return false
      if (categoryId && t.categoryId !== categoryId) return false
      if (month && !t.date.startsWith(month)) return false
      if (needle && !t.note.toLowerCase().includes(needle) && !(t.categoryId && catName.get(t.categoryId)?.includes(needle))) return false
      return true
    })
  }, [data.transactions, data.categories, q, type, walletId, categoryId, month])

  const sum = totals(data, filtered)
  const hasFilter = q || type !== 'all' || walletId || categoryId || month
  const chips: { value: TxType | 'all'; label: string }[] = [
    { value: 'all', label: 'Semua' },
    { value: 'expense', label: 'Keluar' },
    { value: 'income', label: 'Masuk' },
    { value: 'transfer', label: 'Transfer' },
  ]

  return (
    <div className="flex flex-col">
      <PageHeader title="Transaksi" />
      <div className="flex flex-col gap-3 px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" aria-label="Cari transaksi" placeholder="Cari catatan atau kategori" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto" role="radiogroup" aria-label="Jenis">
          {chips.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={type === c.value}
              onClick={() => set('jenis', c.value)}
              className={cx('min-h-9 shrink-0 rounded-full border px-4 text-sm font-medium', type === c.value ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface text-fg')}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select aria-label="Filter dompet" value={walletId} onChange={(e) => set('dompet', e.target.value)} className="text-sm">
            <option value="">Semua dompet</option>
            {data.wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter kategori" value={categoryId} onChange={(e) => set('kategori', e.target.value)} className="text-sm">
            <option value="">Semua kategori</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.type === 'income' ? '(masuk)' : ''}
              </option>
            ))}
          </Select>
          <Input type="month" aria-label="Filter bulan" value={month} onChange={(e) => set('bulan', e.target.value)} className="text-sm" />
        </div>

        {filtered.length > 0 && (
          <Card className="grid grid-cols-3 gap-2 p-3 text-center text-sm">
            <div>
              <p className="text-xs text-muted">Masuk</p>
              <Money minor={sum.income} currency={data.settings.baseCurrency} tone="income" className="font-semibold" />
            </div>
            <div>
              <p className="text-xs text-muted">Keluar</p>
              <Money minor={sum.expense} currency={data.settings.baseCurrency} tone="expense" className="font-semibold" />
            </div>
            <div>
              <p className="text-xs text-muted">Selisih</p>
              <Money minor={sum.net} currency={data.settings.baseCurrency} sign className="font-semibold" />
            </div>
          </Card>
        )}

        {filtered.length === 0 ? (
          hasFilter ? (
            <Empty
              icon={<SearchX className="size-6" />}
              title="Tidak ada yang cocok"
              text="Coba kata kunci lain atau hapus filter."
              action={
                <button
                  type="button"
                  className="min-h-11 font-semibold text-accent"
                  onClick={() => {
                    setQ('')
                    setParams({}, { replace: true })
                  }}
                >
                  Hapus filter
                </button>
              }
            />
          ) : (
            <Empty icon={<Wallet className="size-6" />} title="Belum ada transaksi" text="Tekan tombol + untuk mencatat yang pertama." />
          )
        ) : (
          <>
            <TxGroups txs={filtered.slice(0, limit)} />
            {filtered.length > limit && (
              <button type="button" className="min-h-11 font-semibold text-accent" onClick={() => setLimit(limit + PAGE)}>
                Tampilkan lebih banyak ({filtered.length - limit} lagi)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
