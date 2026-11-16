import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Camera, ImagePlus, Repeat, Trash2, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useData } from '../state'
import { AmountInput, Button, CategoryIcon, Confirm, Field, IconButton, Input, PageHeader, Segmented, Select, Sheet, Switch, cx } from '../components/ui'
import { db } from '../db/db'
import { deleteTransaction, saveRecurring, saveTransaction } from '../db/actions'
import { toLocalISO } from '../lib/dates'
import { compressImage } from '../lib/files'
import { convert, formatMoney } from '../lib/money'
import type { Frequency, TxType } from '../types'

const TYPES: { value: TxType; label: string }[] = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
]

const FREQS: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

function PhotoThumb({ id, onRemove, onOpen }: { id: string; onRemove: () => void; onOpen: (url: string) => void }) {
  const photo = useLiveQuery(() => db.photos.get(id), [id])
  const url = useMemo(() => (photo ? URL.createObjectURL(photo.blob) : undefined), [photo])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  if (!url) return <div className="size-20 animate-pulse rounded-xl bg-surface-2" />
  return <Thumb url={url} onRemove={onRemove} onOpen={() => onOpen(url)} />
}

function Thumb({ url, onRemove, onOpen }: { url: string; onRemove: () => void; onOpen: () => void }) {
  return (
    <div className="relative size-20 shrink-0">
      <button type="button" onClick={onOpen} className="size-full overflow-hidden rounded-xl" aria-label="Lihat foto">
        <img src={url} alt="Lampiran transaksi" className="size-full object-cover" />
      </button>
      <button type="button" onClick={onRemove} aria-label="Hapus foto" className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-fg text-bg shadow">
        <X className="size-4" />
      </button>
    </div>
  )
}

export default function TxForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const data = useData()
  const existing = id ? data.transactions.find((t) => t.id === id) : undefined
  const notFound = !!id && !existing

  const firstWallet = data.activeWallets[0]
  const [type, setType] = useState<TxType>(existing?.type ?? ((params.get('jenis') as TxType) || 'expense'))
  const [amount, setAmount] = useState<number | null>(existing?.amount ?? null)
  const [walletId, setWalletId] = useState(existing?.walletId ?? params.get('dompet') ?? firstWallet?.id ?? '')
  const [toWalletId, setToWalletId] = useState(existing?.toWalletId ?? data.activeWallets.find((w) => w.id !== walletId)?.id ?? '')
  const [toAmount, setToAmount] = useState<number | null>(existing?.toAmount ?? null)
  const [categoryId, setCategoryId] = useState<string | undefined>(existing?.categoryId)
  const [date, setDate] = useState(existing?.date ?? toLocalISO(new Date()))
  const [note, setNote] = useState(existing?.note ?? '')
  const [keptPhotos, setKeptPhotos] = useState<string[]>(existing?.photoIds ?? [])
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<{ blob: Blob; url: string }[]>([])
  const [repeat, setRepeat] = useState(false)
  const [freq, setFreq] = useState<Frequency>('monthly')
  const [autoAdd, setAutoAdd] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [viewer, setViewer] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => () => newPhotos.forEach((p) => URL.revokeObjectURL(p.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const wallet = data.wallets.find((w) => w.id === walletId)
  const toWallet = data.wallets.find((w) => w.id === toWalletId)
  const currency = wallet?.currency ?? data.settings.baseCurrency
  const crossCurrency = type === 'transfer' && wallet && toWallet && wallet.currency !== toWallet.currency
  const cats = data.categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense') && !c.archived)

  // Keep the received amount in sync with the user-set rate until the user edits it.
  const [toAmountTouched, setToAmountTouched] = useState(existing?.toAmount !== undefined)
  useEffect(() => {
    if (crossCurrency && !toAmountTouched && amount != null) {
      setToAmount(convert(amount, wallet!.currency, toWallet!.currency, data.settings.baseCurrency, data.settings.rates))
    }
  }, [crossCurrency, toAmountTouched, amount, wallet, toWallet, data.settings])

  if (notFound) {
    return (
      <>
        <PageHeader title="Transaksi" back />
        <p className="p-6 text-center text-muted">Transaksi ini sudah dihapus atau tidak ada.</p>
      </>
    )
  }

  async function addFiles(files: FileList | null) {
    if (!files) return
    const added = await Promise.all([...files].filter((f) => f.type.startsWith('image/')).map(async (f) => {
      const blob = await compressImage(f)
      return { blob, url: URL.createObjectURL(blob) }
    }))
    setNewPhotos((p) => [...p, ...added])
  }

  async function submit() {
    const e: Record<string, string> = {}
    if (!amount || amount <= 0) e.amount = 'Masukkan jumlah lebih dari 0.'
    if (!walletId) e.wallet = 'Pilih dompet.'
    if (type === 'transfer') {
      if (!toWalletId) e.toWallet = 'Pilih dompet tujuan.'
      else if (toWalletId === walletId) e.toWallet = 'Dompet tujuan harus berbeda.'
      if (crossCurrency && (!toAmount || toAmount <= 0)) e.toAmount = 'Masukkan jumlah yang diterima.'
    }
    if (!date) e.date = 'Pilih tanggal.'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    const base = {
      type,
      amount: amount!,
      walletId,
      toWalletId: type === 'transfer' ? toWalletId : undefined,
      toAmount: type === 'transfer' ? (crossCurrency ? toAmount! : amount!) : undefined,
      categoryId: type === 'transfer' ? undefined : categoryId,
      note: note.trim(),
    }
    if (repeat && !existing) {
      const catName = data.categories.find((c) => c.id === categoryId)?.name
      // The first occurrence is recorded now; the schedule continues from the next one.
      const rid = await saveRecurring({
        ...base,
        name: note.trim() || catName || (type === 'transfer' ? 'Transfer' : 'Transaksi rutin'),
        frequency: freq,
        interval: 1,
        startDate: date,
        autoAdd,
        count: 1,
      })
      await saveTransaction({ ...base, date, recurringId: rid }, newPhotos.map((p) => p.blob))
    } else {
      await saveTransaction({ ...base, id: existing?.id, date, recurringId: existing?.recurringId, photoIds: keptPhotos }, newPhotos.map((p) => p.blob), removedPhotos)
    }
    nav(-1)
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={existing ? 'Ubah transaksi' : 'Catat transaksi'}
        back
        actions={
          existing && (
            <IconButton label="Hapus transaksi" onClick={() => setConfirmDelete(true)} className="text-expense">
              <Trash2 className="size-5" />
            </IconButton>
          )
        }
      />
      <form
        className="flex flex-col gap-5 px-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Segmented
          label="Jenis transaksi"
          value={type}
          options={TYPES}
          onChange={(t) => {
            setType(t)
            setCategoryId(undefined)
          }}
        />

        <Field label={type === 'transfer' ? 'Jumlah dikirim' : 'Jumlah'} error={errors.amount}>
          {(fid) => <AmountInput id={fid} value={amount} onChange={setAmount} currency={currency} autoFocus={!existing} large />}
        </Field>

        {type !== 'transfer' && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-muted">Kategori</legend>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Kategori">
              {cats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={categoryId === c.id}
                  onClick={() => setCategoryId(c.id === categoryId ? undefined : c.id)}
                  className={cx('flex min-h-20 flex-col items-center gap-1 rounded-2xl border p-2 text-center text-xs leading-tight', categoryId === c.id ? 'border-accent bg-accent-soft font-semibold' : 'border-transparent')}
                >
                  <CategoryIcon icon={c.icon} color={c.color} />
                  <span className="line-clamp-2">{c.name}</span>
                </button>
              ))}
              <Link to="/kategori" className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line p-2 text-xs text-muted">
                + Atur
              </Link>
            </div>
          </fieldset>
        )}

        <div className={cx('grid gap-3', type === 'transfer' && 'grid-cols-2')}>
          <Field label={type === 'transfer' ? 'Dari' : 'Dompet'} error={errors.wallet}>
            {(fid) => (
              <Select id={fid} value={walletId} onChange={(e) => setWalletId(e.target.value)}>
                {data.activeWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.currency})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {type === 'transfer' && (
            <Field label="Ke" error={errors.toWallet}>
              {(fid) => (
                <Select id={fid} value={toWalletId} onChange={(e) => setToWalletId(e.target.value)}>
                  <option value="">Pilih…</option>
                  {data.activeWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.currency})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>

        {crossCurrency && (
          <Field label={`Jumlah diterima (${toWallet!.currency})`} error={errors.toAmount} hint="Dihitung dari kurs di Pengaturan. Ubah kalau kurs sebenarnya beda.">
            {(fid) => (
              <AmountInput
                id={fid}
                value={toAmount}
                onChange={(v) => {
                  setToAmountTouched(true)
                  setToAmount(v)
                }}
                currency={toWallet!.currency}
              />
            )}
          </Field>
        )}

        <Field label="Tanggal & jam" error={errors.date}>
          {(fid) => <Input id={fid} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>

        <Field label="Catatan">
          {(fid) => <Input id={fid} value={note} maxLength={200} placeholder="Opsional, mis. makan siang bareng tim" onChange={(e) => setNote(e.target.value)} />}
        </Field>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-muted">Foto struk / bukti</legend>
          <div className="flex flex-wrap gap-3">
            {keptPhotos.map((pid) => (
              <PhotoThumb
                key={pid}
                id={pid}
                onOpen={setViewer}
                onRemove={() => {
                  setKeptPhotos((p) => p.filter((x) => x !== pid))
                  setRemovedPhotos((p) => [...p, pid])
                }}
              />
            ))}
            {newPhotos.map((p, i) => (
              <Thumb
                key={p.url}
                url={p.url}
                onOpen={() => setViewer(p.url)}
                onRemove={() => {
                  URL.revokeObjectURL(p.url)
                  setNewPhotos((all) => all.filter((_, j) => j !== i))
                }}
              />
            ))}
            <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs text-muted focus-within:border-accent">
              <Camera className="size-5" aria-hidden />
              Kamera
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => addFiles(e.target.files)} />
            </label>
            <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs text-muted focus-within:border-accent">
              <ImagePlus className="size-5" aria-hidden />
              Galeri
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
            </label>
          </div>
        </fieldset>

        {!existing && (
          <div className="rounded-2xl border border-line bg-surface p-3">
            <Switch checked={repeat} onChange={setRepeat} label="Ulangi otomatis" description="Untuk gaji, langganan, cicilan, atau tagihan rutin" />
            {repeat && (
              <div className="mt-3 flex flex-col gap-3">
                <Segmented label="Frekuensi" value={freq} options={FREQS} onChange={setFreq} />
                <Switch
                  checked={autoAdd}
                  onChange={setAutoAdd}
                  label="Catat sendiri tiap jatuh tempo"
                  description={autoAdd ? 'Langsung tercatat tanpa perlu dibuka.' : 'Muncul sebagai tagihan di Beranda, kamu tekan Bayar.'}
                />
              </div>
            )}
          </div>
        )}

        {existing?.recurringId && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Repeat className="size-4" aria-hidden /> Bagian dari jadwal rutin.{' '}
            <Link to="/tagihan" className="font-semibold text-accent">
              Atur jadwal
            </Link>
          </p>
        )}

        <div className="pb-safe sticky bottom-0 -mx-4 bg-bg/95 px-4 py-3 backdrop-blur">
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan'}
            {amount ? ` · ${formatMoney(amount, currency)}` : ''}
          </Button>
        </div>
      </form>

      <Confirm
        open={confirmDelete}
        title="Hapus transaksi?"
        text="Transaksi dan fotonya akan dihapus dari HP ini. Saldo dompet ikut disesuaikan."
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteTransaction(existing!.id)
          nav(-1)
        }}
      />
      <Sheet open={!!viewer} onClose={() => setViewer(null)} title="Foto">
        {viewer && <img src={viewer} alt="Lampiran transaksi" className="w-full rounded-xl" />}
      </Sheet>
    </div>
  )
}
