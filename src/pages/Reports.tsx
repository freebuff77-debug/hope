import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartPie, ChevronLeft, ChevronRight } from 'lucide-react'
import { useData } from '../state'
import { Card, CategoryIcon, Empty, IconButton, Input, Money, PageHeader, Segmented } from '../components/ui'
import { Bars, Donut } from '../components/charts'
import { byCategory, categoryName, inRange, totals, trend } from '../lib/finance'
import { addDays, fmtRange, fromLocalISO, monthShort, periodRange, shiftPeriod, toDateKey, type Range, type ReportPeriod } from '../lib/dates'
import { formatMoney } from '../lib/money'

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'daily', label: 'Hari' },
  { value: 'weekly', label: 'Minggu' },
  { value: 'monthly', label: 'Bulan' },
  { value: 'yearly', label: 'Tahun' },
  { value: 'custom', label: 'Kustom' },
]

export default function Reports() {
  const data = useData()
  const base = data.settings.baseCurrency
  const [period, setPeriod] = useState<ReportPeriod>('monthly')
  const [ref, setRef] = useState(new Date())
  const [from, setFrom] = useState(() => toDateKey(addDays(new Date(), -29)))
  const [to, setTo] = useState(() => toDateKey(new Date()))
  const [kind, setKind] = useState<'expense' | 'income'>('expense')

  const range: Range =
    period === 'custom'
      ? { start: fromLocalISO(from <= to ? from : to), end: addDays(fromLocalISO(from <= to ? to : from), 1) }
      : periodRange(period, ref, data.settings.weekStart)

  const txs = inRange(data.transactions, range)
  const t = totals(data, txs)
  const slices = byCategory(data, txs, kind)
  const buckets = trend(data, data.transactions, range, (d, unit) => (unit === 'month' ? monthShort(d.getMonth()) : String(d.getDate())))
  const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000))
  const isFuture = period !== 'custom' && range.end > new Date() && range.start <= new Date()

  return (
    <div className="flex flex-col">
      <PageHeader title="Laporan" />
      <div className="flex flex-col gap-4 px-4">
        <Segmented label="Periode" value={period} options={PERIODS} onChange={(p) => { setPeriod(p); setRef(new Date()) }} />

        {period === 'custom' ? (
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" aria-label="Dari tanggal" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" aria-label="Sampai tanggal" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <IconButton label="Periode sebelumnya" onClick={() => setRef(shiftPeriod(period, ref, -1))}>
              <ChevronLeft className="size-5" />
            </IconButton>
            <p className="font-semibold">{fmtRange(period, range)}</p>
            <IconButton label="Periode berikutnya" onClick={() => setRef(shiftPeriod(period, ref, 1))} disabled={isFuture} className="disabled:opacity-30">
              <ChevronRight className="size-5" />
            </IconButton>
          </div>
        )}

        <Card className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted">Pemasukan</p>
            <Money minor={t.income} currency={base} tone="income" className="text-lg font-bold" />
          </div>
          <div>
            <p className="text-xs text-muted">Pengeluaran</p>
            <Money minor={t.expense} currency={base} tone="expense" className="text-lg font-bold" />
          </div>
          <div>
            <p className="text-xs text-muted">Selisih</p>
            <Money minor={t.net} currency={base} sign className="font-semibold" />
          </div>
          <div>
            <p className="text-xs text-muted">Rata-rata keluar / hari</p>
            <Money minor={Math.round(t.expense / days)} currency={base} className="font-semibold" />
          </div>
        </Card>

        {period !== 'daily' && (
          <Card>
            <h2 className="mb-3 font-bold">Arus uang</h2>
            <Bars buckets={buckets} currency={base} />
          </Card>
        )}

        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bold">Per kategori</h2>
            <div className="w-48">
              <Segmented
                label="Jenis kategori"
                value={kind}
                onChange={setKind}
                options={[
                  { value: 'expense', label: 'Keluar' },
                  { value: 'income', label: 'Masuk' },
                ]}
              />
            </div>
          </div>
          {slices.length === 0 ? (
            <Empty icon={<ChartPie className="size-6" />} title="Belum ada data" text={`Tidak ada ${kind === 'expense' ? 'pengeluaran' : 'pemasukan'} di periode ini.`} />
          ) : (
            <>
              <Donut
                slices={slices.map((s) => ({ value: s.amount, color: data.categories.find((c) => c.id === s.categoryId)?.color ?? '#94a3b8', label: categoryName(data.categories, s.categoryId) }))}
                centerLabel={kind === 'expense' ? 'Total keluar' : 'Total masuk'}
                centerValue={formatMoney(kind === 'expense' ? t.expense : t.income, base, { compact: true })}
              />
              <ul className="mt-4 flex flex-col">
                {slices.map((s) => {
                  const cat = data.categories.find((c) => c.id === s.categoryId)
                  const ym = toDateKey(range.start).slice(0, 7)
                  const href = `/transaksi?jenis=${kind}${s.categoryId ? `&kategori=${s.categoryId}` : ''}${period === 'monthly' ? `&bulan=${ym}` : ''}`
                  return (
                    <li key={s.categoryId ?? 'none'}>
                      <Link to={href} className="flex min-h-14 items-center gap-3 rounded-xl px-1 hover:bg-surface-2">
                        <CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{categoryName(data.categories, s.categoryId)}</span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                            <span className="block h-full rounded-full" style={{ width: `${s.share * 100}%`, backgroundColor: cat?.color ?? '#94a3b8' }} />
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="tabular block text-sm font-semibold">{formatMoney(s.amount, base)}</span>
                          <span className="block text-xs text-muted">
                            {Math.round(s.share * 100)}% · {s.count}x
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
