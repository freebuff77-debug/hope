import { useEffect, useState } from 'react'
import { Plus, Repeat } from 'lucide-react'
import { useData } from '../state'
import { AmountInput, Button, CategoryIcon, Confirm, Empty, Field, IconButton, Input, Money, PageHeader, Segmented, Select, Sheet, Switch, cx } from '../components/ui'
import { daysBetween, fmtDate, toLocalISO } from '../lib/dates'
import { describeSchedule, nextDue } from '../lib/recurring'
import { formatMoney } from '../lib/money'
import { deleteRecurring, payBill, saveRecurring, skipBill } from '../db/actions'
import type { Frequency, Recurring, TxType } from '../types'

const FREQS: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

function RecurringSheet({ open, onClose, item }: { open: boolean; onClose: () => void; item?: Recurring }) {
  const data = useData()
  const [name, setName] = useState('')
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState<number | null>(null)
  const [walletId, setWalletId] = useState('')
  const [toWalletId, setToWalletId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [interval, setInterval] = useState(1)
  const [start, setStart] = useState('')
  const [endDate, setEndDate] = useState('')
  const [autoAdd, setAutoAdd] = useState(false)
  const [active, setActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    const d = new Date()
    d.setHours(9, 0, 0, 0)
    setName(item?.name ?? '')
    setType(item?.type ?? 'expense')
    setAmount(item?.amount ?? null)
    setWalletId(item?.walletId ?? data.activeWallets[0]?.id ?? '')
    setToWalletId(item?.toWalletId ?? '')
    setCategoryId(item?.categoryId ?? '')
    setFrequency(item?.frequency ?? 'monthly')
    setInterval(item?.interval ?? 1)
    setStart(item?.startDate ?? toLocalISO(d))
    setEndDate(item?.endDate ?? '')
    setAutoAdd(item?.autoAdd ?? false)
    setActive(item?.active ?? true)
    setErrors({})
  }, [open, item, data.activeWallets])

  const currency = data.wallets.find((w) => w.id === walletId)?.currency ?? data.settings.baseCurrency
  const cats = data.categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'))

  async function save() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Beri nama, mis. Listrik atau Netflix.'
    if (!amount || amount <= 0) e.amount = 'Masukkan jumlah lebih dari 0.'
    if (type === 'transfer' && (!toWalletId || toWalletId === walletId)) e.toWallet = 'Pilih dompet tujuan yang berbeda.'
    if (!start) e.start = 'Pilih tanggal mulai.'
    setErrors(e)
    if (Object.keys(e).length) return
    await saveRecurring({
      id: item?.id,
      name: name.trim(),
      type,
      amount: amount!,
      walletId,
      toWalletId: type === 'transfer' ? toWalletId : undefined,
      toAmount: type === 'transfer' ? amount! : undefined,
      categoryId: type === 'transfer' ? undefined : categoryId || undefined,
      note: '',
      frequency,
      interval: Math.max(1, interval),
      startDate: start,
      endDate: endDate || undefined,
      autoAdd,
      active,
    })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={item ? 'Ubah jadwal' : 'Tagihan / transaksi rutin'}
        footer={
          <div className="flex gap-2">
            {item && (
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
          <Segmented
            label="Jenis"
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: 'Keluar' },
              { value: 'income', label: 'Masuk' },
              { value: 'transfer', label: 'Transfer' },
            ]}
          />
          <Field label="Nama" error={errors.name}>
            {(id) => <Input id={id} value={name} maxLength={60} placeholder="mis. Listrik PLN, Kos, Gaji" onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Jumlah" error={errors.amount}>
            {(id) => <AmountInput id={id} value={amount} onChange={setAmount} currency={currency} />}
          </Field>
          <div className={cx('grid gap-3', type !== 'transfer' && 'grid-cols-2')}>
            <Field label={type === 'transfer' ? 'Dari dompet' : 'Dompet'}>
              {(id) => (
                <Select id={id} value={walletId} onChange={(e) => setWalletId(e.target.value)}>
                  {data.activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {type === 'transfer' ? (
              <Field label="Ke dompet" error={errors.toWallet}>
                {(id) => (
                  <Select id={id} value={toWalletId} onChange={(e) => setToWalletId(e.target.value)}>
                    <option value="">Pilih…</option>
                    {data.activeWallets
                      .filter((w) => w.currency === currency)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                  </Select>
                )}
              </Field>
            ) : (
              <Field label="Kategori">
                {(id) => (
                  <Select id={id} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Tanpa kategori</option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
          </div>
          <Segmented label="Frekuensi" value={frequency} options={FREQS} onChange={setFrequency} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mulai / jatuh tempo pertama" error={errors.start}>
              {(id) => <Input id={id} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />}
            </Field>
            <Field label="Setiap … kali">
              {(id) => <Input id={id} type="number" min={1} max={99} value={interval} onChange={(e) => setInterval(Number(e.target.value) || 1)} />}
            </Field>
          </div>
          <Field label="Berakhir (opsional)" hint="Kosongkan kalau tidak ada akhirnya, mis. untuk cicilan 12 bulan isi tanggal terakhir.">
            {(id) => <Input id={id} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />}
          </Field>
          <Switch
            checked={autoAdd}
            onChange={setAutoAdd}
            label="Catat otomatis"
            description={autoAdd ? 'Tercatat sendiri saat jatuh tempo.' : 'Diingatkan di Beranda, kamu tekan Bayar saat sudah dibayar.'}
          />
          {item && <Switch checked={active} onChange={setActive} label="Aktif" description="Matikan untuk menjeda tanpa menghapus." />}
        </div>
      </Sheet>
      <Confirm
        open={confirm}
        title={`Hapus ${item?.name}?`}
        text="Transaksi yang sudah tercatat tidak ikut terhapus."
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await deleteRecurring(item!.id)
          onClose()
        }}
      />
    </>
  )
}

export default function Bills() {
  const data = useData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Recurring | undefined>()
  const now = new Date()
  const items = data.recurring
    .map((r) => ({ r, due: nextDue(r) }))
    .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity))
  const monthlyCost = data.recurring
    .filter((r) => r.active && r.type === 'expense')
    .reduce((sum, r) => {
      const perMonth = { daily: 30, weekly: 52 / 12, monthly: 1, yearly: 1 / 12 }[r.frequency] / Math.max(1, r.interval)
      const cur = data.wallets.find((w) => w.id === r.walletId)?.currency
      return cur === data.settings.baseCurrency ? sum + r.amount * perMonth : sum
    }, 0)

  const openNew = () => {
    setEditing(undefined)
    setOpen(true)
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Tagihan & rutin"
        back
        actions={
          <IconButton label="Tambah jadwal" onClick={openNew}>
            <Plus className="size-6" />
          </IconButton>
        }
      />
      <div className="flex flex-col gap-4 px-4">
        {items.length === 0 ? (
          <Empty
            icon={<Repeat className="size-6" />}
            title="Belum ada tagihan rutin"
            text="Listrik, kos, cicilan, langganan, atau gaji bulanan. Kantong akan mengingatkan atau mencatatnya otomatis."
            action={<Button onClick={openNew}>Tambah</Button>}
          />
        ) : (
          <>
            {monthlyCost > 0 && (
              <div className="rounded-card border border-line bg-surface p-4">
                <p className="text-sm text-muted">Perkiraan pengeluaran rutin per bulan</p>
                <Money minor={Math.round(monthlyCost)} currency={data.settings.baseCurrency} className="text-xl font-bold" />
              </div>
            )}
            <ul className="flex flex-col gap-2">
              {items.map(({ r, due }) => {
                const cat = data.categories.find((c) => c.id === r.categoryId)
                const currency = data.wallets.find((w) => w.id === r.walletId)?.currency ?? data.settings.baseCurrency
                const d = due ? daysBetween(now, due) : null
                const overdue = d !== null && d < 0 && !r.autoAdd
                return (
                  <li key={r.id} className={cx('rounded-card border border-line bg-surface p-3', !r.active && 'opacity-60')}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 text-left"
                      onClick={() => {
                        setEditing(r)
                        setOpen(true)
                      }}
                    >
                      <CategoryIcon icon={cat?.icon ?? (r.type === 'income' ? 'coins' : 'receipt')} color={cat?.color} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{r.name}</span>
                        <span className="block text-xs text-muted">
                          {describeSchedule(r)} · {r.autoAdd ? 'otomatis' : 'pengingat'}
                          {!r.active && ' · dijeda'}
                        </span>
                        <span className={cx('block text-xs', overdue ? 'font-semibold text-expense' : 'text-muted')}>
                          {due ? (overdue ? `Lewat ${-d!} hari (${fmtDate(due)})` : `Berikutnya ${fmtDate(due)}`) : r.active ? 'Selesai' : ''}
                        </span>
                      </span>
                      <span className={cx('tabular font-semibold', r.type === 'income' ? 'text-income' : r.type === 'expense' ? 'text-expense' : '')}>{formatMoney(r.amount, currency)}</span>
                    </button>
                    {!r.autoAdd && due && r.active && d !== null && d <= 7 && (
                      <div className="mt-3 flex gap-2">
                        <Button variant="secondary" className="min-h-9 flex-1" onClick={() => skipBill(r)}>
                          Lewati kali ini
                        </Button>
                        <Button className="min-h-9 flex-1" onClick={() => payBill(r, toLocalISO(new Date()))}>
                          Tandai dibayar
                        </Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
      <RecurringSheet open={open} onClose={() => setOpen(false)} item={editing} />
    </div>
  )
}
