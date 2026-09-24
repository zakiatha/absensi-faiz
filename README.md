# E-Absensi Asrama Putra 🏢

Sistem Informasi Manajemen Absensi Digital Santri Asrama Putra & Monitoring Kedisiplinan Bapak Kamar (PJ).

## 🚀 Fitur Utama
- **4 Sesi Absensi Harian**: Sesi Pagi, Siang, Sore, dan Malam.
- **Role-Based Access Control (RBAC)**: Hak akses terpisah untuk Administrator dan Bapak Kamar (PJ).
- **Monitoring PJ Kamar**: Evaluasi kepatuhan dan ketepatan waktu input absensi oleh PJ kamar.
- **Rekap Bulanan & Export**: Analisis kehadiran santri dan rekap kedisiplinan dengan fitur export CSV.
- **Keamanan Data**: Enkripsi password menggunakan hash SHA-256, sanitasi input, dan perlindungan XSS.
- **UI/UX Modern & Responsif**: Mobile-first design dengan dukungan mode Terang/Gelap (Light/Dark mode).

## 🌐 Deployment (Vercel)
Aplikasi web ini menggunakan arsitektur Vanilla HTML, CSS, dan JavaScript murni.
Tidak memerlukan build step, sehingga dapat langsung di-deploy di Vercel:
1. Hubungkan repository GitHub ini (`zakiatha/absensi-faiz`) ke Vercel.
2. Biarkan konfigurasi Framework Preset default (**Other**).
3. Root Directory tetap default (`./`).
4. Klik **Deploy**.
