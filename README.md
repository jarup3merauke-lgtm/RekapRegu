# Rekap Regu

Website untuk otomatisasi rekap harian rating bintang 5 PLN Mobile per regu (UP3 Merauke).

Alur pakai:
1. Drop 1 file Excel **"Laporan Detail Check In Check Out (CICO)"**.
2. Pilih tanggal laporan (otomatis terisi daftar tanggal yang tersedia di file, urut dari yang terbaru).
3. Klik **Proses & Kirim ke WhatsApp**.
4. Sistem menghitung No Laporan per regu per ULP untuk tanggal terpilih dan mengirim teks hasilnya ke grup WhatsApp via [Fonnte](https://fonnte.com).

## Aturan perhitungan

Hanya baris dengan `Sumber Lapor` = "PLN Mobile" pada tanggal terpilih yang dihitung, per "No Laporan":

- ✅ **Sudah rating**: status (kolom APKT Status) = "Selesai", rating = 5
- ❌ **Belum rating**: status = "Selesai", rating kosong

Regu yang tidak punya laporan pada tanggal terpilih tetap ditampilkan dengan keterangan "nihil" (daftar regu tetap per ULP sudah di-hardcode di `lib/roster.ts`).

Jika ada baris dengan posko/regu yang tidak dikenali, atau kombinasi status/rating di luar 2 kategori di atas, sistem menampilkan warning tapi tetap memproses baris lain.

## Setup lokal

```bash
npm install
cp .env.example .env.local   # isi FONNTE_TOKEN & FONNTE_TARGET
npm run dev
```

## Deploy ke Vercel

1. Import project ini di Vercel (repo terpisah dari project rekap ULP).
2. Di Project Settings > Environment Variables, tambahkan:
   - `FONNTE_TOKEN` — token device Fonnte kamu.
   - `FONNTE_TARGET` — nomor/ID grup WhatsApp tujuan.
3. Deploy.

## Struktur

- `app/page.tsx` — UI upload, pemilihan tanggal, tombol proses.
- `app/api/dates/route.ts` — endpoint untuk membaca daftar tanggal yang tersedia di file CICO.
- `app/api/process/route.ts` — endpoint yang menerima file + tanggal, memproses, dan mengirim ke WhatsApp.
- `lib/cico.ts` — parsing Excel CICO dan perhitungan rekap per regu.
- `lib/roster.ts` — daftar tetap ULP & regu.
- `lib/dateId.ts` — helper format tanggal Indonesia.
- `lib/fonnte.ts` — pemanggilan API Fonnte.
