import { useRef, useState } from 'react'
import { CloudUpload, FileSpreadsheet, FolderDown, History, Send, ShieldCheck, TriangleAlert, Upload } from 'lucide-react'
import { useData } from '../state'
import { Button, Card, Confirm, PageHeader, Switch, cx } from '../components/ui'
import { importBackup, setSetting } from '../db/actions'
import { backupNow, exportCSVFile, shareBackup } from '../db/backup'
import { isNative } from '../native'
import { daysBetween, fmtDate, fmtTime } from '../lib/dates'

type Msg = { tone: 'ok' | 'err'; text: string } | null

const isCancel = (err: unknown) => err instanceof Error && /cancel|abort/i.test(err.message + err.name)

export function backupAge(last: number | undefined, now = new Date()): number | null {
  return last ? daysBetween(new Date(last), now) : null
}

export default function Backup() {
  const data = useData()
  const s = data.settings
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [pending, setPending] = useState<string | null>(null)
  const age = backupAge(s.lastBackupAt)
  const stale = age === null || age > 30
  const photos = data.transactions.reduce((n, t) => n + t.photoIds.length, 0)

  async function run(key: string, fn: () => Promise<string | void>, ok: (r: string | void) => string) {
    setBusy(key)
    setMsg(null)
    try {
      const r = await fn()
      setMsg({ tone: 'ok', text: ok(r) })
    } catch (err) {
      if (!isCancel(err)) setMsg({ tone: 'err', text: err instanceof Error && err.message ? `Gagal: ${err.message}` : 'Gagal. Coba lagi.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Cadangan data" back />
      <div className="flex flex-col gap-4 px-4">
        <section aria-label="Status cadangan" className={cx('rounded-card p-5', stale ? 'border border-warn/40 bg-warn/10' : 'bg-brand')}>
          <div className="flex items-start gap-3">
            {stale ? <TriangleAlert className="mt-0.5 size-6 shrink-0 text-warn" aria-hidden /> : <ShieldCheck className="mt-0.5 size-6 shrink-0" aria-hidden />}
            <div>
              <p className="font-semibold">{s.lastBackupAt ? `Terakhir dicadangkan ${age === 0 ? 'hari ini' : age === 1 ? 'kemarin' : `${age} hari lalu`}` : 'Belum pernah dicadangkan'}</p>
              <p className={cx('mt-0.5 text-sm', stale ? 'text-muted' : 'opacity-85')}>
                {s.lastBackupAt
                  ? `${fmtDate(new Date(s.lastBackupAt))}, ${fmtTime(new Date(s.lastBackupAt))}`
                  : 'Data Maalun hanya tersimpan di HP ini. Kalau HP hilang, rusak, atau aplikasi dihapus, data ikut hilang.'}
              </p>
              <p className={cx('mt-2 text-xs', stale ? 'text-muted' : 'opacity-85')}>
                Isi cadangan: {data.transactions.length} transaksi, {data.wallets.length} dompet, {data.budgets.length} anggaran, {data.recurring.length} tagihan, {data.goals.length} target, {photos} foto
              </p>
            </div>
          </div>
        </section>

        <Card className="flex flex-col gap-3">
          <h2 className="font-bold">Cadangkan</h2>
          <Button
            disabled={!!busy}
            onClick={() => run('save', backupNow, (where) => `Cadangan tersimpan di ${where}`)}
          >
            <FolderDown className="size-5" aria-hidden />
            {busy === 'save' ? 'Mencadangkan…' : isNative ? 'Cadangkan ke HP' : 'Cadangkan (unduh file)'}
          </Button>
          <Button variant="secondary" disabled={!!busy} onClick={() => run('share', shareBackup, () => 'Cadangan siap. Simpan di Google Drive atau kirim ke chat sendiri.')}>
            <Send className="size-5" aria-hidden />
            {busy === 'share' ? 'Menyiapkan…' : 'Kirim ke Google Drive / WhatsApp'}
          </Button>
          <p className="text-xs text-muted">
            {isNative
              ? 'File disimpan di folder Documents/Maalun (buka lewat aplikasi File). Simpan juga salinannya di Google Drive supaya aman kalau HP hilang.'
              : 'File .json berisi semua data dan foto. Simpan di Google Drive atau tempat aman lainnya.'}
          </p>
          {isNative && (
            <div className="border-t border-line pt-3">
              <Switch
                checked={s.autoBackup}
                onChange={(v) => setSetting('autoBackup', v)}
                label="Cadangan otomatis tiap minggu"
                description="Disimpan diam-diam ke Documents/Maalun/Otomatis. 4 cadangan terakhir disimpan."
              />
              {s.autoBackup && s.lastAutoBackupAt && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <History className="size-3.5" aria-hidden /> Otomatis terakhir: {fmtDate(new Date(s.lastAutoBackupAt))}
                </p>
              )}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-bold">Pulihkan</h2>
          <p className="text-sm text-muted">Pindah HP atau install ulang? Pilih file cadangan Maalun (.json). Data di HP ini akan diganti dengan isi file.</p>
          <Button variant="secondary" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            <Upload className="size-5" aria-hidden /> Pilih file cadangan
          </Button>
          <input
            ref={fileRef}
            type="file"
            // Android often labels .json from WhatsApp/Drive as a generic file, so don't filter there.
            accept={isNative ? undefined : 'application/json,.json'}
            className="sr-only"
            aria-label="Pilih file cadangan"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) setPending(await f.text())
            }}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-bold">Ekspor untuk Excel</h2>
          <Button variant="secondary" disabled={!!busy} onClick={() => run('csv', exportCSVFile, (where) => `CSV tersimpan di ${where}`)}>
            <FileSpreadsheet className="size-5" aria-hidden /> Ekspor transaksi ke CSV
          </Button>
          <p className="text-xs text-muted">Hanya daftar transaksi, untuk dibuka di Excel atau Google Sheets. Tidak bisa dipakai untuk memulihkan.</p>
        </Card>

        {msg && (
          <p role="status" className={cx('flex items-start gap-2 rounded-xl p-3 text-sm', msg.tone === 'ok' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense')}>
            <CloudUpload className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="break-all">{msg.text}</span>
          </p>
        )}
      </div>

      <Confirm
        open={pending !== null}
        title="Pulihkan cadangan?"
        text="Semua data di HP ini akan diganti dengan isi file cadangan. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Pulihkan"
        onClose={() => setPending(null)}
        onConfirm={() => {
          const json = pending!
          run('restore', () => importBackup(json), () => 'Data berhasil dipulihkan.')
        }}
      />
    </div>
  )
}
