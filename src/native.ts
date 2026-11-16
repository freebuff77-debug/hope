import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

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
