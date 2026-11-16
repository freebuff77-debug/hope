import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

/** Folder inside the phone's public Documents folder, visible in the Files app. */
export const BACKUP_DIR = 'Maalun'
export const AUTO_DIR = `${BACKUP_DIR}/Otomatis`

/** Android back button: close an open dialog first, then go back, then leave the app. */
export async function setupNative() {
  if (!isNative) return
  const { App } = await import('@capacitor/app')
  App.addListener('backButton', ({ canGoBack }) => {
    if (document.querySelector('[role="dialog"]')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    } else if (canGoBack && location.hash && location.hash !== '#/') {
      history.back()
    } else {
      App.exitApp()
    }
  })
}

export async function setStatusBarDark(dark: boolean) {
  if (!isNative) return
  const { SystemBars, SystemBarsStyle } = await import('@capacitor/core')
  await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}

/** WebView can't download blobs, so write the file to cache and open the share sheet. */
export async function shareFile(filename: string, content: string) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')
  const { uri } = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 })
  await Share.share({ title: filename, files: [uri], dialogTitle: 'Simpan atau kirim file' })
}

/**
 * Writes into Documents/<dir>/ on the phone so the file survives uninstalling the app.
 * Android 9 and older need the storage permission; newer versions let apps create
 * their own files there without it. Returns the user-facing location.
 */
export async function saveToDocuments(dir: string, filename: string, content: string): Promise<string> {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const perm = await Filesystem.checkPermissions()
  if (perm.publicStorage !== 'granted') {
    const req = await Filesystem.requestPermissions()
    if (req.publicStorage !== 'granted') throw new Error('Izin penyimpanan ditolak.')
  }
  await Filesystem.writeFile({ path: `${dir}/${filename}`, data: content, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true })
  return `Documents/${dir}/${filename}`
}

/** Keeps only the newest `keep` files in Documents/<dir>. Files from an earlier install can't be deleted; those are skipped. */
export async function pruneDocuments(dir: string, keep: number) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const { files } = await Filesystem.readdir({ path: dir, directory: Directory.Documents })
  const old = files
    .filter((f) => f.type === 'file' && f.name.endsWith('.json'))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(keep)
  for (const f of old) await Filesystem.deleteFile({ path: `${dir}/${f.name}`, directory: Directory.Documents }).catch(() => {})
}
