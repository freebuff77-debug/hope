# Maalun

Aplikasi catatan keuangan pribadi: pengeluaran, pemasukan, transfer, anggaran,
tagihan rutin, target tabungan, dan laporan. **Semua fitur gratis**: tanpa
iklan, tanpa langganan, tanpa akun. Data tersimpan di HP pengguna (IndexedDB),
jadi tidak ada server yang perlu dibayar.

Dibangun clean-room dari fitur yang dijelaskan di listing Play Store
"Sumlio: Expense & Budget" (lihat `replica/recon.md`). Tidak ada kode, aset,
nama, atau teks yang diambil dari aplikasi aslinya.

## Fitur

- Catat pengeluaran, pemasukan, dan transfer antar dompet, lengkap dengan tanggal, jam, catatan, dan foto struk (kamera atau galeri)
- Banyak dompet, masing-masing dengan mata uangnya sendiri; total dikonversi dengan kurs yang kamu atur sendiri
- Kategori bawaan dan kategori buatan sendiri (ikon + warna)
- Anggaran harian, mingguan, bulanan, atau tahunan per kategori, dengan sisa per hari
- Tagihan dan transaksi rutin: dicatat otomatis atau diingatkan di Beranda (Bayar / Lewati)
- Target tabungan dengan progres dan setoran per bulan yang dibutuhkan
- Laporan harian, mingguan, bulanan, tahunan, atau rentang kustom: grafik arus uang dan donat per kategori
- Cari dan filter transaksi, mode gelap, cadangan ke folder Documents/Maalun, Google Drive, atau WhatsApp (termasuk foto), cadangan otomatis mingguan, pulihkan dari file, ekspor CSV
- Bisa dipasang di Android sebagai aplikasi (PWA) dan jalan offline

## Menjalankan

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # unit test logika uang, jadwal, anggaran, cadangan
pnpm build      # hasil statis di dist/
```

## Memasang di HP (gratis)

Unggah folder `dist/` ke hosting statis gratis (GitHub Pages, Cloudflare Pages,
Netlify). Untuk GitHub Pages di subfolder, build dengan
`BASE_PATH=/nama-repo/ pnpm build`. Buka alamatnya di Chrome Android, lalu
menu ⋮ → **Instal aplikasi**.

## Membuat APK Android

Butuh JDK 21 dan Android SDK (platform 36). Aplikasi dibungkus dengan Capacitor;
semua data tetap tersimpan di HP.

```bash
pnpm android:apk
# hasil: android/app/build/outputs/apk/release/app-release.apk
```

APK rilis ditandatangani dengan kunci di `android/keystore.properties` dan
`android/kantong-release.jks`. Keduanya sengaja tidak masuk git. **Simpan
cadangannya**: update aplikasi hanya bisa dipasang di atas versi lama kalau
ditandatangani dengan kunci yang sama. Tanpa file itu, build menghasilkan APK
tanpa tanda tangan. Naikkan `versionCode` di `android/app/build.gradle` setiap
rilis baru.

Ikon dan splash dibuat dari logo di `assets/source/` dengan `uv run --with pillow python scripts/make_icons.py assets/source/maalun-logo.png`, lalu
`pnpm dlx @capacitor/assets generate --android`.
