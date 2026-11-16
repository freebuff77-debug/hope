import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'id.animeku.app',
  appName: 'Animeku',
  webDir: 'dist',
  android: { backgroundColor: '#0c0d13' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_animeku', iconColor: '#ff4f81' },
  },
}

export default config
