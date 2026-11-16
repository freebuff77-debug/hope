import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, DatabaseBackup, Eye, EyeOff, ReceiptText, Target, Wallet as WalletIcon } from 'lucide-react'
import { useData } from '../state'
import { Button, Card, CategoryIcon, Empty, Money, Progress, cx } from '../components/ui'
import { TxGroups } from '../components/TxRow'
import { backupAge } from './Backup'
import { budgetStatus, inRange, totalBalance, totals } from '../lib/finance'
import { formatMoney } from '../lib/money'
import { addDays, daysBetween, fmtDate, periodRange, toLocalISO } from '../lib/dates'
import { nextDue } from '../lib/recurring'
import { payBill, skipBill } from '../db/actions'
import { iconFor } from '../lib/icons'

const HIDE_KEY = 'kantong:hide-balance'
const logoUrl = `${import.meta.env.BASE_URL}logo.png`

export default function Home() {
  const data = useData()
  const { settings } = data
  const base = settings.baseCurrency
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDE_KEY) === '1')
  const now = new Date()
  const month = periodRange('monthly', now)
  const t = totals(data, inRange(data.transactions, month))
  const balance = totalBalance(data, data.balances)
  const mask = (s: string) => (hidden ? '••••••' : s)

  const bills = data.recurring
    .filter((r) => !r.autoAdd && r.active)
    .map((r) => ({ r, due: nextDue(r) }))
    .filter((x): x is { r: typeof x.r; due: Date } => !!x.due && x.due < addDays(now, 4))
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  const budgets = data.budgets.map((b) => budgetStatus(data, b, data.transactions, now)).sort((a, b) => b.ratio - a.ratio)
  const recent = data.transactions.slice(0, 8)
  const backupDays = backupAge(settings.lastBackupAt)
  const needsBackup = data.transactions.length >= 5 && (backupDays === null || backupDays > 14)

  return (
    <div className="flex flex-col gap-4 px-4">
      <header className="flex min-h-14 items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <img src={logoUrl} alt="" className="size-9 rounded-[10px]" width={36} height={36} />
          Maalun
        </h1>
        <button
          type="button"
          onClick={() => {
            setHidden(!hidden)
            localStorage.setItem(HIDE_KEY, hidden ? '0' : '1')
          }}
          className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-2"
          aria-label={hidden ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
        >
          {hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </header>

      <section aria-label="Ringkasan saldo" className="rounded-card bg-brand p-5 shadow-lg shadow-accent/20">
        <p className="text-sm opacity-85">Total saldo</p>
        <p className="tabular mt-1 text-3xl font-extrabold break-all">{mask(formatMoney(balance, base))}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/12 p-3">
            <p className="flex items-center gap-1 text-xs opacity-85">
              <ArrowDownLeft className="size-4" aria-hidden /> Masuk bulan ini
            </p>
            <p className="tabular mt-0.5 font-bold break-all">{mask(formatMoney(t.income, base))}</p>
          </div>
          <div className="rounded-2xl bg-white/12 p-3">
            <p className="flex items-center gap-1 text-xs opacity-85">
              <ArrowUpRight className="size-4" aria-hidden /> Keluar bulan ini
            </p>
            <p className="tabular mt-0.5 font-bold break-all">{mask(formatMoney(t.expense, base))}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="wallets-h">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="wallets-h" className="font-bold">
            Dompet
          </h2>
          <Link to="/dompet" className="flex min-h-11 items-center text-sm font-semibold text-accent">
            Kelola <ChevronRight className="size-4" />
          </Link>
        </div>
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {data.activeWallets.map((w) => {
            const Icon = iconFor(w.icon)
            return (
              <li key={w.id} className="w-40 shrink-0 snap-start">
                <Link to={`/transaksi?dompet=${w.id}`} className="block rounded-2xl border border-line bg-surface p-3">
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <Icon className="size-4 shrink-0" style={{ color: w.color }} aria-hidden />
                    <span className="truncate">{w.name}</span>
                  </span>
                  <span className="tabular mt-1 block truncate font-bold">{mask(formatMoney(data.balances.get(w.id) ?? 0, w.currency))}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {needsBackup && (
        <Link to="/cadangan" className="flex items-center gap-3 rounded-card border border-accent/30 bg-accent-soft p-4">
          <DatabaseBackup className="size-6 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{backupDays === null ? 'Datamu belum dicadangkan' : `Cadangan terakhir ${backupDays} hari lalu`}</span>
            <span className="block text-xs text-muted">Simpan cadangan supaya data aman kalau HP hilang atau ganti HP.</span>
          </span>
          <span className="text-sm font-semibold text-accent">Cadangkan</span>
        </Link>
      )}

      {bills.length > 0 && (
        <Card>
          <h2 className="mb-2 flex items-center gap-2 font-bold">
            <ReceiptText className="size-5 text-warn" aria-hidden /> Tagihan
          </h2>
          <ul className="flex flex-col divide-y divide-line">
            {bills.map(({ r, due }) => {
              const cat = data.categories.find((c) => c.id === r.categoryId)
              const currency = data.wallets.find((w) => w.id === r.walletId)?.currency ?? base
              const d = daysBetween(now, due)
              const when = d < 0 ? `Lewat ${-d} hari` : d === 0 ? 'Hari ini' : d === 1 ? 'Besok' : `${fmtDate(due, false)}`
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
                  <CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className={cx('text-xs', d < 0 ? 'font-semibold text-expense' : 'text-muted')}>
                      {when} · {formatMoney(r.amount, currency)}
                    </span>
                  </span>
                  <span className="flex gap-1">
                    <Button variant="secondary" className="min-h-9 px-3" onClick={() => skipBill(r)}>
                      Lewati
                    </Button>
                    <Button className="min-h-9 px-3" onClick={() => payBill(r, toLocalISO(new Date()))}>
                      Bayar
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <section aria-labelledby="budgets-h">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="budgets-h" className="font-bold">
            Anggaran
          </h2>
          <Link to="/anggaran" className="flex min-h-11 items-center text-sm font-semibold text-accent">
            Semua <ChevronRight className="size-4" />
          </Link>
        </div>
        {budgets.length === 0 ? (
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Target className="size-5" aria-hidden />
              </span>
              <p className="flex-1 text-sm text-muted">Pasang batas belanja per kategori supaya tidak kebablasan.</p>
              <Link to="/anggaran?baru=1" className="text-sm font-semibold text-accent">
                Buat
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col gap-4">
            {budgets.slice(0, 3).map((s) => (
              <div key={s.budget.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{s.budget.name}</span>
                  <span className="tabular shrink-0 text-muted">
                    <Money minor={s.spent} currency={base} className={s.ratio >= 1 ? 'text-expense' : 'text-fg'} /> / {formatMoney(s.budget.amount, base)}
                  </span>
                </div>
                <Progress ratio={s.ratio} label={s.budget.name} />
              </div>
            ))}
          </Card>
        )}
      </section>

      <section aria-labelledby="recent-h">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="recent-h" className="font-bold">
            Transaksi terakhir
          </h2>
          {recent.length > 0 && (
            <Link to="/transaksi" className="flex min-h-11 items-center text-sm font-semibold text-accent">
              Semua <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <Card>
            <Empty
              icon={<WalletIcon className="size-6" />}
              title="Belum ada catatan"
              text="Mulai dengan mencatat pengeluaran pertamamu. Semua tersimpan di HP ini saja."
              action={
                <Link to="/tx/new" className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg">
                  Catat sekarang
                </Link>
              }
            />
          </Card>
        ) : (
          <TxGroups txs={recent} />
        )}
      </section>
    </div>
  )
}
