import { useEffect, useState } from 'react'
import { PartyPopper, PiggyBank, Plus } from 'lucide-react'
import { useData } from '../state'
import { AmountInput, Button, ColorPicker, Confirm, Empty, Field, IconButton, IconPicker, Input, PageHeader, Progress, Select, Sheet, Segmented } from '../components/ui'
import { COLORS, iconFor } from '../lib/icons'
import { CURRENCIES, formatMoney } from '../lib/money'
import { daysBetween, fmtDate, fromLocalISO } from '../lib/dates'
import { addToGoal, deleteGoal, saveGoal } from '../db/actions'
import type { Goal } from '../types'

const GOAL_ICONS = ['piggy', 'home', 'car', 'plane', 'school', 'laptop', 'phone', 'love', 'baby', 'heart', 'gift', 'trophy', 'bike', 'shirt', 'building', 'sparkles']

function GoalSheet({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: Goal }) {
  const data = useData()
  const [name, setName] = useState('')
  const [target, setTarget] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(0)
  const [currency, setCurrency] = useState('IDR')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState(COLORS[7])
  const [icon, setIcon] = useState('piggy')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(goal?.name ?? '')
    setTarget(goal?.target ?? null)
    setSaved(goal?.saved ?? 0)
    setCurrency(goal?.currency ?? data.settings.baseCurrency)
    setDeadline(goal?.deadline ?? '')
    setColor(goal?.color ?? COLORS[7])
    setIcon(goal?.icon ?? 'piggy')
    setErrors({})
  }, [open, goal, data.settings.baseCurrency])

  async function save() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Beri nama target.'
    if (!target || target <= 0) e.target = 'Masukkan target lebih dari 0.'
    setErrors(e)
    if (Object.keys(e).length) return
    await saveGoal({ id: goal?.id, name: name.trim(), target: target!, saved: saved ?? 0, currency, deadline: deadline || undefined, color, icon })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={goal ? 'Ubah target' : 'Target tabungan baru'}
        footer={
          <div className="flex gap-2">
            {goal && (
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
          <Field label="Nama" error={errors.name}>
            {(id) => <Input id={id} value={name} maxLength={50} placeholder="mis. Dana darurat, Umrah, Laptop baru" onChange={(e) => setName(e.target.value)} />}
          </Field>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Target" error={errors.target}>
              {(id) => <AmountInput id={id} value={target} onChange={setTarget} currency={currency} />}
            </Field>
            <Field label="Mata uang">
              {(id) => (
                <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field label="Sudah terkumpul">{(id) => <AmountInput id={id} value={saved} onChange={setSaved} currency={currency} />}</Field>
          <Field label="Tenggat (opsional)">{(id) => <Input id={id} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />}</Field>
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Ikon</p>
            <IconPicker value={icon} onChange={setIcon} names={GOAL_ICONS} color={color} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Warna</p>
            <ColorPicker value={color} onChange={setColor} colors={COLORS} />
          </div>
        </div>
      </Sheet>
      <Confirm open={confirm} title={`Hapus ${goal?.name}?`} text="Target ini akan dihapus. Saldo dompetmu tidak berubah." onClose={() => setConfirm(false)} onConfirm={async () => { await deleteGoal(goal!.id); onClose() }} />
    </>
  )
}

function DepositSheet({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const [mode, setMode] = useState<'add' | 'take'>('add')
  const [amount, setAmount] = useState<number | null>(null)
  useEffect(() => {
    setAmount(null)
    setMode('add')
  }, [goal])
  return (
    <Sheet
      open={!!goal}
      onClose={onClose}
      title={goal?.name ?? ''}
      footer={
        <Button
          className="w-full"
          disabled={!amount}
          onClick={async () => {
            await addToGoal(goal!.id, mode === 'add' ? amount! : -amount!)
            onClose()
          }}
        >
          {mode === 'add' ? 'Tambah tabungan' : 'Ambil tabungan'}
        </Button>
      }
    >
      {goal && (
        <div className="flex flex-col gap-4">
          <Segmented label="Aksi" value={mode} onChange={setMode} options={[{ value: 'add', label: 'Setor' }, { value: 'take', label: 'Ambil' }]} />
          <AmountInput label="Jumlah" value={amount} onChange={setAmount} currency={goal.currency} large autoFocus />
          <p className="text-xs text-muted">Ini hanya mencatat progres target. Kalau uangnya dipindah antar dompet, catat juga sebagai Transfer.</p>
        </div>
      )}
    </Sheet>
  )
}

export default function Goals() {
  const data = useData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | undefined>()
  const [deposit, setDeposit] = useState<Goal | undefined>()
  const now = new Date()

  const openNew = () => {
    setEditing(undefined)
    setOpen(true)
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Target tabungan" back actions={<IconButton label="Tambah target" onClick={openNew}><Plus className="size-6" /></IconButton>} />
      <div className="flex flex-col gap-3 px-4">
        {data.goals.length === 0 ? (
          <Empty icon={<PiggyBank className="size-6" />} title="Belum ada target" text="Dana darurat, DP rumah, liburan. Pantau progresnya di sini." action={<Button onClick={openNew}>Buat target</Button>} />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.goals.map((g) => {
              const Icon = iconFor(g.icon)
              const ratio = g.target ? g.saved / g.target : 0
              const done = ratio >= 1
              const left = Math.max(0, g.target - g.saved)
              const days = g.deadline ? daysBetween(now, fromLocalISO(g.deadline)) : null
              const months = days !== null && days > 0 ? Math.max(1, Math.ceil(days / 30)) : null
              return (
                <li key={g.id} className="rounded-card border border-line bg-surface p-4">
                  <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => { setEditing(g); setOpen(true) }}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${g.color}22`, color: g.color }} aria-hidden>
                      {done ? <PartyPopper className="size-5" /> : <Icon className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{g.name}</span>
                      <span className="tabular block text-sm text-muted">
                        {formatMoney(g.saved, g.currency)} / {formatMoney(g.target, g.currency)}
                      </span>
                    </span>
                    <span className="text-sm font-semibold">{Math.round(ratio * 100)}%</span>
                  </button>
                  <div className="mt-3">
                    <Progress ratio={Math.min(ratio, 0.999)} label={g.name} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted">
                      {done
                        ? 'Tercapai! 🎉'
                        : g.deadline
                          ? days! < 0
                            ? `Tenggat ${fmtDate(fromLocalISO(g.deadline))} sudah lewat`
                            : `Kurang ${formatMoney(left, g.currency)} · ±${formatMoney(Math.ceil(left / months!), g.currency)}/bulan`
                          : `Kurang ${formatMoney(left, g.currency)}`}
                    </p>
                    <Button variant="secondary" className="min-h-9 px-3" onClick={() => setDeposit(g)}>
                      Setor / ambil
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <GoalSheet open={open} onClose={() => setOpen(false)} goal={editing} />
      <DepositSheet goal={deposit} onClose={() => setDeposit(undefined)} />
    </div>
  )
}
