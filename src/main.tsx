import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { isNative, setupNative } from './native'

// The APK ships its files locally; a service worker would only risk serving stale builds.
if (!isNative) import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
setupNative()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
