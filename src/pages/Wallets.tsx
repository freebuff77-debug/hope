import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Plus } from 'lucide-react'
import { useData } from '../state'
import { AmountInput, Button, ColorPicker, Confirm, Field, IconButton, IconPicker, Input, Money, PageHeader, Select, Sheet, Switch } from '../components/ui'
import { COLORS, iconFor } from '../lib/icons'
import { CURRENCIES, formatMoney } from '../lib/money'
import { totalBalance } from '../lib/finance'
import { deleteWallet, saveWallet } from '../db/actions'
import type { Wallet } from '../types'

const WALLET_ICONS = ['wallet', 'bank', 'card', 'phone', 'piggy', 'coins', 'banknote', 'building', 'briefcase', 'store', 'trending', 'handcoins', 'gift', 'plane', 'home', 'tag']

function WalletSheet({ open, onClose, wallet }: { open: boolean; onClose: () => void; wallet?: Wallet }) {
  const data = useData()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('IDR')
  const [initial, setInitial] = useState<number | null>(0)
  const [color, setColor] = useState(COLORS[19])
  const [icon, setIcon] = useState('wallet')
  const [archived, setArchived] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const txCount = wallet ? data.transactions.filter((t) => t.walletId === wallet.id || t.toWalletId === wallet.id).length : 0

  useEffect(() => {
    if (!open) return
    setName(wallet?.name ?? '')
    setCurrency(wallet?.currency ?? data.settings.baseCurrency)
    setInitial(wallet?.initialBalance ?? 0)
    setColor(wallet?.color ?? COLORS[19])
    setIcon(wallet?.icon ?? 'wallet')
    setArchived(wallet?.archived ?? false)
    setError('')
  }, [open, wallet, data.settings.baseCurrency])

  async function save() {
    if (!name.trim()) return setError('Beri nama dompet.')
    if (archived && data.activeWallets.length <= 1 && !wallet?.archived) return setError('Minimal satu dompet harus aktif.')
    await saveWallet({ id: wallet?.id, name: name.trim(), currency, initialBalance: initial ?? 0, color, icon, archived })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={wallet ? 'Ubah dompet' : 'Dompet baru'}
        footer={
          <div className="flex gap-2">
            {wallet && (
              <Button variant="danger" onClick={() => setConfirm(true)} disabled={data.wallets.length <= 1}>
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
          <Field label="Nama" error={error}>
            {(id) => <Input id={id} value={name} maxLength={40} placeholder="mis. BCA, GoPay, Celengan" onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Mata uang" hint={wallet && txCount ? 'Mengubah mata uang tidak mengonversi transaksi lama.' : undefined}>
            {(id) => (
              <Select id={id} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Saldo awal" hint="Saldo sebelum kamu mulai mencatat di Kantong.">
            {(id) => <AmountInput id={id} value={initial} onChange={setInitial} currency={currency} />}
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Ikon</p>
            <IconPicker value={icon} onChange={setIcon} names={WALLET_ICONS} color={color} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Warna</p>
            <ColorPicker value={color} onChange={setColor} colors={COLORS} />
          </div>
          {wallet && <Switch checked={archived} onChange={setArchived} label="Arsipkan" description="Disembunyikan dan tidak dihitung di total saldo. Riwayat tetap ada." />}
        </div>
      </Sheet>
      <Confirm
        open={confirm}
        title={`Hapus ${wallet?.name}?`}
        text={txCount ? `${txCount} transaksi di dompet ini juga akan dihapus. Kalau hanya ingin menyembunyikan, pakai Arsipkan.` : 'Dompet ini belum punya transaksi.'}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await deleteWallet(wallet!.id)
          onClose()
        }}
      />
    </>
  )
}

export default function Wallets() {
  const data = useData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Wallet | undefined>()
  const base = data.settings.baseCurrency
  const active = data.wallets.filter((w) => !w.archived)
  const archived = data.wallets.filter((w) => w.archived)

  const row = (w: Wallet) => {
    const Icon = iconFor(w.icon)
    const bal = data.balances.get(w.id) ?? 0
    return (
      <li key={w.id} className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setEditing(w)
            setOpen(true)
          }}
          className="flex min-h-16 flex-1 items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-2"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${w.color}22`, color: w.color }} aria-hidden>
            <Icon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{w.name}</span>
            <span className="text-xs text-muted">{w.currency}</span>
          </span>
          <Money minor={bal} currency={w.currency} tone={bal < 0 ? 'expense' : undefined} className="font-semibold" />
        </button>
        <Link to={`/transaksi?dompet=${w.id}`} className="min-h-11 px-2 text-xs leading-[2.75rem] font-semibold text-accent">
          Riwayat
        </Link>
      </li>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Dompet"
        back
        actions={
          <IconButton
            label="Tambah dompet"
            onClick={() => {
              setEditing(undefined)
              setOpen(true)
            }}
          >
            <Plus className="size-6" />
          </IconButton>
        }
      />
      <div className="flex flex-col gap-4 px-4">
        <section className="rounded-card bg-accent p-5 text-accent-fg">
          <p className="text-sm opacity-85">Total semua dompet aktif ({base})</p>
          <p className="tabular mt-1 text-2xl font-extrabold">{formatMoney(totalBalance(data, data.balances), base)}</p>
        </section>
        <ul className="rounded-card border border-line bg-surface p-1">{active.map(row)}</ul>
        {archived.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
              <Archive className="size-4" aria-hidden /> Diarsipkan
            </h2>
            <ul className="rounded-card border border-line bg-surface p-1 opacity-75">{archived.map(row)}</ul>
          </section>
        )}
        <p className="text-center text-xs text-muted">Tambah dompet sebanyak apa pun, gratis.</p>
      </div>
      <WalletSheet open={open} onClose={() => setOpen(false)} wallet={editing} />
    </div>
  )
}
