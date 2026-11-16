# Calm

Puzzle sambung garis yang santai, terinspirasi dari gameplay "Infinity Loop".
Ketuk kepingan untuk memutarnya sampai semua garis tersambung. Level tanpa
batas, tanpa waktu, tanpa skor. **Gratis, tanpa iklan, tanpa pembelian, offline**
(APK tidak meminta izin internet).

## Mode

- **Terang**: sambungkan semua garis. Tidak boleh ada ujung yang menggantung
  atau keluar papan.
- **Gelap**: kebalikannya. Putuskan semua sambungan sampai tidak ada kepingan
  yang saling menyentuh.

Level dibuat dari seed, jadi level N selalu sama di semua HP. Papan membesar
pelan-pelan sampai 7×11. Progres, posisi kepingan di level yang sedang
dimainkan, serta pengaturan suara dan getar tersimpan di HP.

Dibuat clean-room dari deskripsi publik di Play Store (`replica/recon.md`):
kode, gambar, warna, ikon, dan teks semuanya baru.

## Menjalankan

```bash
pnpm install
pnpm dev          # http://localhost:5174
pnpm test         # generator level, cek selesai, rotasi
pnpm icons        # buat ulang ikon & splash dari kode (scripts/make-icons.mjs)
```

## APK Android

Butuh JDK 21 dan Android SDK 36.

```bash
pnpm android:apk
# hasil: android/app/build/outputs/apk/release/app-release.apk
```

Ditandatangani dengan `android/calm-release.jks` lewat
`android/keystore.properties`. Keduanya tidak masuk git. **Simpan
cadangannya**: update hanya bisa dipasang di atas versi lama jika kuncinya sama.
Naikkan `versionCode` di `android/app/build.gradle` setiap rilis.

Setelah `pnpm icons`, jalankan
`pnpm dlx @capacitor/assets generate --android --iconBackgroundColor '#73a5b4' --splashBackgroundColor '#73a5b4'`.
