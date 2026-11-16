import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Target } from 'lucide-react'
import { useData } from '../state'
import { AmountInput, Button, Card, CategoryIcon, Confirm, Empty, Field, IconButton, Input, Money, PageHeader, Progress, Segmented, Sheet, cx } from '../components/ui'
import { budgetStatus, type BudgetStatus } from '../lib/finance'
import { fmtRange, PERIOD_LABEL, type Period } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { deleteBudget, saveBudget } from '../db/actions'
import type { Budget } from '../types'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

function BudgetCard({ s, onEdit }: { s: BudgetStatus; onEdit: () => void }) {
  const data = useData()
  const base = data.settings.baseCurrency
  const cats = s.budget.categoryIds.map((id) => data.categories.find((c) => c.id === id)).filter((c) => !!c)
  const over = s.remaining < 0
  return (
    <li>
      <button type="button" onClick={onEdit} className="w-full rounded-card border border-line bg-surface p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-bold">{s.budget.name}</p>
            <p className="text-xs text-muted">
              {PERIOD_LABEL[s.budget.period]} · {fmtRange(s.budget.period, s.range)}
            </p>
          </div>
          <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', over ? 'bg-expense/10 text-expense' : s.ratio >= 0.8 ? 'bg-warn/15 text-warn' : 'bg-accent-soft text-accent')}>
            {Math.round(s.ratio * 100)}%
          </span>
        </div>
        <div className="mt-3">
          <Progress ratio={s.ratio} label={s.budget.name} />
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span>
            <Money minor={s.spent} currency={base} className="font-semibold" /> <span className="text-muted">dari {formatMoney(s.budget.amount, base)}</span>
          </span>
        </div>
        <p className={cx('mt-1 text-sm', over ? 'font-semibold text-expense' : 'text-muted')}>
          {over
            ? `Lewat ${formatMoney(-s.remaining, base)}`
            : `Sisa ${formatMoney(s.remaining, base)}${s.perDayLeft !== null ? ` · ${formatMoney(s.perDayLeft, base)}/hari untuk ${s.daysLeft} hari lagi` : ''}`}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cats.length === 0 ? (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">Semua pengeluaran</span>
          ) : (
            cats.map((c) => (
              <span key={c.id} className="flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pr-2 pl-0.5 text-xs">
                <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                {c.name}
              </span>
            ))
          )}
        </div>
      </button>
    </li>
  )
}

function BudgetSheet({ open, onClose, budget }: { open: boolean; onClose: () => void; budget?: Budget }) {
  const data = useData()
  const [name, setName] = useState('')
  const [period, setPeriod] = useState<Period>('monthly')
  const [amount, setAmount] = useState<number | null>(null)
  const [catIds, setCatIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(budget?.name ?? '')
    setPeriod(budget?.period ?? 'monthly')
    setAmount(budget?.amount ?? null)
    setCatIds(budget?.categoryIds ?? [])
    setError('')
  }, [open, budget])

  const cats = data.categories.filter((c) => c.type === 'expense' && !c.archived)
  const toggle = (id: string) => setCatIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  async function save() {
    if (!amount || amount <= 0) return setError('Masukkan batas lebih dari 0.')
    const autoName = catIds.length === 1 ? cats.find((c) => c.id === catIds[0])?.name : catIds.length ? `${catIds.length} kategori` : 'Semua pengeluaran'
    await saveBudget({ id: budget?.id, name: name.trim() || autoName || 'Anggaran', period, amount, categoryIds: catIds })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={budget ? 'Ubah anggaran' : 'Anggaran baru'}
        footer={
          <div className="flex gap-2">
            {budget && (
              <Button variant="danger" onClick={() => setConfirm(true)}>
                Hapus
              </Button>
            )}
            <Button className="flex-1" onClick={save}>
              Simpan
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Segmented label="Periode" value={period} options={PERIODS} onChange={setPeriod} />
          <Field label="Batas" error={error} hint={`Dalam ${data.settings.baseCurrency}. Transaksi mata uang lain dikonversi.`}>
            {(id) => <AmountInput id={id} value={amount} onChange={setAmount} currency={data.settings.baseCurrency} large />}
          </Field>
          <Field label="Nama (opsional)">{(id) => <Input id={id} value={name} maxLength={60} placeholder="mis. Jajan bulanan" onChange={(e) => setName(e.target.value)} />}</Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-muted">Kategori {catIds.length === 0 && '· semua pengeluaran'}</legend>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={catIds.includes(c.id)}
                  onClick={() => toggle(c.id)}
                  className={cx('flex min-h-10 items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm', catIds.includes(c.id) ? 'border-accent bg-accent-soft font-semibold' : 'border-line')}
                >
                  <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                  {c.name}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </Sheet>
      <Confirm
        open={confirm}
        title="Hapus anggaran?"
        text="Transaksimu tidak ikut terhapus."
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await deleteBudget(budget!.id)
          onClose()
        }}
      />
    </>
  )
}

export default function Budgets() {
  const data = useData()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Budget | undefined>()
  const [open, setOpen] = useState(params.get('baru') === '1')
  const now = new Date()
  const list = data.budgets.map((b) => budgetStatus(data, b, data.transactions, now))
  const totalLimit = list.filter((s) => s.budget.period === 'monthly').reduce((a, s) => a + s.budget.amount, 0)
  const totalSpent = list.filter((s) => s.budget.period === 'monthly').reduce((a, s) => a + s.spent, 0)

  const openNew = () => {
    setEditing(undefined)
    setOpen(true)
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Anggaran"
        actions={
          <IconButton label="Tambah anggaran" onClick={openNew}>
            <Plus className="size-6" />
          </IconButton>
        }
      />
      <div className="flex flex-col gap-4 px-4">
        {list.length === 0 ? (
          <Card>
            <Empty
              icon={<Target className="size-6" />}
              title="Belum ada anggaran"
              text="Tentukan batas harian, mingguan, bulanan, atau tahunan. Kamu akan lihat sisanya tiap hari."
              action={<Button onClick={openNew}>Buat anggaran</Button>}
            />
          </Card>
        ) : (
          <>
            {totalLimit > 0 && (
              <Card>
                <p className="text-sm text-muted">Anggaran bulanan terpakai</p>
                <p className="mt-1 mb-2 text-lg font-bold">
                  <Money minor={totalSpent} currency={data.settings.baseCurrency} /> <span className="text-sm font-normal text-muted">/ {formatMoney(totalLimit, data.settings.baseCurrency)}</span>
                </p>
                <Progress ratio={totalSpent / totalLimit} label="Total anggaran bulanan" />
              </Card>
            )}
            <ul className="flex flex-col gap-3">
              {list.map((s) => (
                <BudgetCard
                  key={s.budget.id}
                  s={s}
                  onEdit={() => {
                    setEditing(s.budget)
                    setOpen(true)
                  }}
                />
              ))}
            </ul>
          </>
        )}
      </div>
      <BudgetSheet
        open={open}
        budget={editing}
        onClose={() => {
          setOpen(false)
          if (params.has('baru')) setParams({}, { replace: true })
        }}
      />
    </div>
  )
}
