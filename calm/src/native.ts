import { isNative } from './feedback'

export async function setSystemBars(dark: boolean) {
  if (!isNative) return
  const { SystemBars, SystemBarsStyle } = await import('@capacitor/core')
  await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}

/** Android back: leave a game for the menu, leave the app from the menu. */
export async function onBack(handler: () => boolean) {
  if (!isNative) return () => {}
  const { App } = await import('@capacitor/app')
  const sub = await App.addListener('backButton', () => {
    if (!handler()) App.exitApp()
  })
  return () => sub.remove()
}
