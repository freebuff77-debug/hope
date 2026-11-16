import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Coins, Download, FileSpreadsheet, Heart, Moon, PiggyBank, ReceiptText, Shapes, Trash2, Upload, Wallet } from 'lucide-react'
import { useData } from '../state'
import { Button, Card, Confirm, Field, Input, PageHeader, Segmented, Select, Sheet } from '../components/ui'
import { CURRENCIES } from '../lib/money'
import { exportBackup, exportCSV, importBackup, resetAll, setSetting, ensureSeeded } from '../db/actions'
import { download } from '../lib/files'
import { toDateKey } from '../lib/dates'
import type { Settings } from '../types'

function Row({ to, onClick, icon, label, hint }: { to?: string; onClick?: () => void; icon: ReactNode; label: string; hint?: string }) {
  const inner = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block truncate text-xs text-muted">{hint}</span>}
      </span>
      <ChevronRight className="size-5 text-muted" aria-hidden />
    </>
  )
  const cls = 'flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-2'
  return <li>{to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>}</li>
}

function RatesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useData()
  const base = data.settings.baseCurrency
  const used = [...new Set([...data.wallets.map((w) => w.currency), ...data.goals.map((g) => g.currency)])].filter((c) => c !== base)
  const [rates, setRates] = useState<Record<string, string>>({})
  const value = (c: string) => rates[c] ?? (data.settings.rates[c] ? String(data.settings.rates[c]) : '')
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Kurs mata uang"
      footer={
        <Button
          className="w-full"
          onClick={async () => {
            const next = { ...data.settings.rates }
            for (const c of used) {
              const n = Number(value(c).replace(/\./g, '').replace(',', '.'))
              if (n > 0) next[c] = n
            }
            await setSetting('rates', next)
            onClose()
          }}
        >
          Simpan kurs
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">Dipakai untuk menjumlahkan semua dompet ke {base}. Isi sendiri sesuai kurs hari ini, tanpa perlu internet.</p>
        {used.length === 0 && <p className="text-sm">Semua dompetmu sudah dalam {base}. Tidak ada kurs yang perlu diisi.</p>}
        {used.map((c) => (
          <Field key={c} label={`1 ${c} = … ${base}`} hint={data.settings.rates[c] ? undefined : 'Belum diisi, sementara dihitung 1:1.'}>
            {(id) => <Input id={id} inputMode="decimal" value={value(c)} placeholder="mis. 16250" onChange={(e) => setRates({ ...rates, [c]: e.target.value })} />}
          </Field>
        ))}
      </div>
    </Sheet>
  )
}

export default function More() {
  const data = useData()
  const s = data.settings
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [confirmImport, setConfirmImport] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [ratesOpen, setRatesOpen] = useState(false)
  const billsDue = data.recurring.filter((r) => r.active && !r.autoAdd).length
  const saveFile = async (name: string, content: string, type: string, ok: string) => {
    try {
      await download(name, content, type)
      setMsg({ tone: 'ok', text: ok })
    } catch (err) {
      // Closing the Android share sheet rejects; that is not an error for the user.
      if (!(err instanceof Error && /cancel/i.test(err.message))) setMsg({ tone: 'err', text: 'File gagal dibuat. Coba lagi.' })
    }
  }
  const missingRates = [...new Set(data.wallets.map((w) => w.currency))].filter((c) => c !== s.baseCurrency && !s.rates[c])

  return (
    <div className="flex flex-col">
      <PageHeader title="Lainnya" />
      <div className="flex flex-col gap-4 px-4">
        <Card className="flex items-center gap-3 border-accent/30 bg-accent-soft">
          <Heart className="size-6 shrink-0 text-accent" aria-hidden />
          <p className="text-sm">
            <b>Semua fitur gratis.</b> Tanpa iklan, tanpa langganan, tanpa akun. Datamu tersimpan di HP ini saja.
          </p>
        </Card>

        <ul className="rounded-card border border-line bg-surface p-1">
          <Row to="/dompet" icon={<Wallet className="size-5" />} label="Dompet & rekening" hint={`${data.activeWallets.length} aktif`} />
          <Row to="/kategori" icon={<Shapes className="size-5" />} label="Kategori" hint={`${data.categories.length} kategori`} />
          <Row to="/tagihan" icon={<ReceiptText className="size-5" />} label="Tagihan & transaksi rutin" hint={billsDue ? `${data.recurring.length} jadwal` : 'Listrik, kos, cicilan, gaji'} />
          <Row to="/target" icon={<PiggyBank className="size-5" />} label="Target tabungan" hint={data.goals.length ? `${data.goals.length} target` : 'Dana darurat, liburan, dll.'} />
        </ul>

        <section aria-labelledby="pref-h" className="rounded-card border border-line bg-surface p-4">
          <h2 id="pref-h" className="mb-3 font-bold">
            Preferensi
          </h2>
          <div className="flex flex-col gap-4">
            <Field label="Mata uang utama" hint="Total saldo, laporan, dan anggaran ditampilkan dalam mata uang ini.">
              {(id) => (
                <Select id={id} value={s.baseCurrency} onChange={(e) => setSetting('baseCurrency', e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <button type="button" onClick={() => setRatesOpen(true)} className="flex min-h-11 items-center gap-3 text-left">
              <Coins className="size-5 text-muted" aria-hidden />
              <span className="flex-1">
                <span className="block text-sm font-medium">Kurs mata uang</span>
                <span className={missingRates.length ? 'text-xs text-warn' : 'text-xs text-muted'}>
                  {missingRates.length ? `Belum diisi: ${missingRates.join(', ')}` : 'Atur sendiri, tidak perlu internet'}
                </span>
              </span>
              <ChevronRight className="size-5 text-muted" aria-hidden />
            </button>
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
                <Moon className="size-4" aria-hidden /> Tema
              </p>
              <Segmented<Settings['theme']>
                label="Tema"
                value={s.theme}
                onChange={(v) => setSetting('theme', v)}
                options={[
                  { value: 'system', label: 'Ikuti HP' },
                  { value: 'light', label: 'Terang' },
                  { value: 'dark', label: 'Gelap' },
                ]}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Minggu dimulai hari</p>
              <Segmented<'0' | '1'>
                label="Awal minggu"
                value={String(s.weekStart) as '0' | '1'}
                onChange={(v) => setSetting('weekStart', Number(v) as 0 | 1)}
                options={[
                  { value: '1', label: 'Senin' },
                  { value: '0', label: 'Minggu' },
                ]}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="data-h" className="rounded-card border border-line bg-surface p-1">
          <h2 id="data-h" className="px-3 pt-3 pb-1 font-bold">
            Data & cadangan
          </h2>
          <ul>
            <Row
              icon={<Download className="size-5" />}
              label="Ekspor cadangan"
              hint="File .json berisi semua data dan foto. Simpan di Drive/WA."
              onClick={async () => {
                await saveFile(`kantong-cadangan-${toDateKey(new Date())}.json`, await exportBackup(), 'application/json', 'Cadangan siap disimpan.')
              }}
            />
            <Row icon={<Upload className="size-5" />} label="Pulihkan dari cadangan" hint="Pindah HP atau kembalikan data lama" onClick={() => fileRef.current?.click()} />
            <Row
              icon={<FileSpreadsheet className="size-5" />}
              label="Ekspor ke CSV"
              hint="Buka di Excel atau Google Sheets"
              onClick={async () => {
                await saveFile(`kantong-transaksi-${toDateKey(new Date())}.csv`, await exportCSV(), 'text/csv;charset=utf-8', 'CSV siap disimpan.')
              }}
            />
          </ul>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Pilih file cadangan"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) setConfirmImport(await f.text())
            }}
          />
        </section>

        {msg && (
          <p role="status" className={msg.tone === 'ok' ? 'text-center text-sm text-income' : 'text-center text-sm text-expense'}>
            {msg.text}
          </p>
        )}

        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          <Trash2 className="size-4" /> Hapus semua data
        </Button>
        <p className="pb-4 text-center text-xs text-muted">Kantong v1.0 · gratis & open source</p>
      </div>

      <RatesSheet open={ratesOpen} onClose={() => setRatesOpen(false)} />
      <Confirm
        open={confirmImport !== null}
        title="Pulihkan cadangan?"
        text="Semua data di HP ini akan diganti dengan isi file cadangan."
        confirmLabel="Pulihkan"
        onClose={() => setConfirmImport(null)}
        onConfirm={async () => {
          try {
            await importBackup(confirmImport!)
            setMsg({ tone: 'ok', text: 'Data berhasil dipulihkan.' })
          } catch (err) {
            setMsg({ tone: 'err', text: err instanceof Error && err.message.includes('Kantong') ? err.message : 'File tidak bisa dibaca. Pastikan itu cadangan dari Kantong.' })
          }
        }}
      />
      <Confirm
        open={confirmReset}
        title="Hapus semua data?"
        text="Semua transaksi, dompet, anggaran, tagihan, target, dan foto akan dihapus permanen. Ekspor cadangan dulu kalau ragu."
        confirmLabel="Hapus semua"
        onClose={() => setConfirmReset(false)}
        onConfirm={async () => {
          await resetAll()
          await ensureSeeded(s.baseCurrency)
          setMsg({ tone: 'ok', text: 'Data sudah dihapus.' })
        }}
      />
    </div>
  )
}
