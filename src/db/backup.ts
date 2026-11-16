import { db } from './db'
import { exportBackup, exportCSV, setSetting } from './actions'
import { AUTO_DIR, BACKUP_DIR, isNative, pruneDocuments, saveToDocuments, shareFile } from '../native'
import { download } from '../lib/files'
import { DEFAULT_SETTINGS } from '../types'

const WEEK = 7 * 24 * 60 * 60 * 1000
const AUTO_KEEP = 4

const pad = (n: number) => String(n).padStart(2, '0')
function stamp(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

export const backupFileName = (d = new Date()) => `maalun-cadangan-${stamp(d)}.json`

async function markBackedUp(auto = false) {
  const now = Date.now()
  await setSetting('lastBackupAt', now)
  if (auto) await setSetting('lastAutoBackupAt', now)
}

/** Manual backup. On the phone: a file in Documents/Maalun. On the web: a download. Returns where it went. */
export async function backupNow(): Promise<string> {
  const json = await exportBackup()
  const name = backupFileName()
  let where: string
  if (isNative) {
    where = await saveToDocuments(BACKUP_DIR, name, json)
  } else {
    await download(name, json)
    where = `folder Unduhan (${name})`
  }
  await markBackedUp()
  return where
}

/** Opens the share sheet (Google Drive, WhatsApp, email…) with a fresh backup file. */
export async function shareBackup() {
  const json = await exportBackup()
  const name = backupFileName()
  if (isNative) {
    await shareFile(name, json)
  } else {
    const file = new File([json], name, { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: name })
    else await download(name, json)
  }
  await markBackedUp()
}

export async function exportCSVFile() {
  const name = `maalun-transaksi-${stamp()}.csv`
  const csv = await exportCSV()
  if (isNative) return saveToDocuments(BACKUP_DIR, name, csv)
  await download(name, csv, 'text/csv;charset=utf-8')
  return `folder Unduhan (${name})`
}

/** Weekly silent backup in Documents/Maalun/Otomatis (app only), keeping the newest few. */
export async function runAutoBackup(now = Date.now()) {
  if (!isNative) return
  const rows = await db.settings.bulkGet(['autoBackup', 'lastAutoBackupAt'])
  const enabled = (rows[0]?.value as boolean | undefined) ?? DEFAULT_SETTINGS.autoBackup
  const last = (rows[1]?.value as number | undefined) ?? 0
  if (!enabled || now - last < WEEK) return
  if ((await db.transactions.count()) === 0) return
  try {
    await saveToDocuments(AUTO_DIR, `maalun-otomatis-${stamp(new Date(now))}.json`, await exportBackup())
    await markBackedUp(true)
    await pruneDocuments(AUTO_DIR, AUTO_KEEP).catch(() => {})
  } catch {
    // Permission denied or storage full: try again next start, the manual button still works.
  }
}
