# 📖 User Guide: Proof of Healing

Selamat datang di **Proof of Healing**, aplikasi pelacak kesehatan mental dan kebiasaan berbasis
privasi mutlak. Aplikasi memanfaatkan Zero-Knowledge Proofs di jaringan Midnight sehingga
perkembangan Anda dapat dibuktikan tanpa satu pun data pribadi diunggah ke internet.

## 🛠️ Persyaratan & persiapan awal

- **Peramban**: Google Chrome / Brave / Firefox versi terbaru.
- **Midnight Extension Wallet** terpasang di peramban. Jika belum ada, aplikasi otomatis
  memakai wallet pengembangan lokal supaya seluruh alur tetap bisa dicoba.
- **Token testnet (tDUST)** untuk deposit jaminan dan biaya jaringan, diperoleh gratis dari
  Midnight Faucet.

## 🚀 Langkah demi langkah

### Langkah 1 — Hubungkan wallet & daftar anonim

1. Buka dApp Proof of Healing.
2. Klik **Connect Wallet** di kanan atas dan izinkan koneksi.
3. Klik **Register & Stake Deposit**.
   - Peramban menjalankan Proof-of-Work singkat, lalu kontrak mengunci **micro-bond 1 tDUST**
     sebagai jaminan bahwa Anda manusia asli.
   - Yang tercatat on-chain hanyalah `commitment = hash(seed rahasia Anda)`.
   - Deposit dikembalikan penuh setelah milestone streak tercapai.

### Langkah 2 — Catat kebiasaan harian (client-side)

1. Di **Dashboard**, tambahkan kebiasaan yang ingin dilacak (misal *Meditasi 15 menit*,
   *Jurnal Emosi*, *Kepatuhan Terapi*).
2. Setiap hari, centang kebiasaan yang selesai, atur mood, dan tulis jurnal bila mau.
3. Klik **Simpan catatan lokal**.

> **Jaminan privasi**: seluruh catatan disimpan di IndexedDB perangkat Anda, terenkripsi
> AES-256-GCM dengan kunci turunan dari seed lokal Anda. Tidak ada server, pengembang, maupun
> pihak lain yang dapat membacanya.

### Langkah 3 — Kirim bukti aktivitas harian

1. Klik **Submit Daily Proof**.
2. Peramban menjalankan Proof-of-Work (± 3–5 detik) untuk membatasi eksekusi masal oleh skrip.
3. Kontrak Compact memverifikasi **jeda minimal 18 jam** antar entri; bila terlalu cepat,
   transaksi ditolak dengan pesan *"interaksi terlalu cepat (terdeteksi bot)"*.
4. Konfirmasi transaksi di wallet Anda. Yang dikirim hanyalah hash komitmen harian.

### Langkah 4 — Klaim milestone & ZK Badge

1. Setelah streak mencapai target (7, 14, atau 30 hari), buka halaman **ZK Badge**.
2. Tombol **Generate ZK Proof** aktif untuk milestone yang memenuhi syarat.
3. Kontrak memverifikasi `streak ≥ target` tanpa mengetahui tanggal, nama kebiasaan, atau isi
   catatan Anda.
4. Badge anonim diterbitkan dan **micro-bond dikembalikan** ke wallet Anda.

### Langkah 5 — Bergabung ke Anonymous Peer Group

1. Buka halaman **Peer Group**. Akses dibuka oleh ZK Badge minimal 7 hari.
2. Anda muncul dengan alias turunan komitmen ZK (misal `healer-3f8c`) — tanpa nama, foto, atau
   identitas sosial.

## ❓ FAQ

**Apakah jurnal saya bisa dilihat publik di blockchain?**
Tidak. Jurnal terenkripsi di perangkat Anda; hanya bukti matematika (benar/salah) yang dikirim.

**Mengapa harus mengunci token jaminan?**
Micro-bonding adalah mekanisme anti-Sybil native kontrak Compact. Token dikembalikan saat
milestone tercapai.

**Bagaimana jika saya lupa mencatat beberapa hari?**
Hitungan streak menyesuaikan diri dan Anda dapat memulai streak baru kapan saja; data historis
lokal tidak hilang.

**Apakah data saya hilang jika ganti perangkat atau membersihkan peramban?**
Ya. Data hanya ada di perangkat Anda — itulah harga dari privasi mutlak. Backup terenkripsi
masuk roadmap Wave 3.

## 🛠️ Masalah & bantuan

- Pastikan wallet Midnight terhubung ke **Testnet**.
- Pastikan saldo tDUST cukup untuk gas dan deposit.
- Bila tombol **Submit Daily Proof** tidak aktif, periksa sisa waktu cooldown 18 jam yang
  ditampilkan di Dashboard.
- Laporkan kendala sebagai issue di repositori GitHub proyek (topic `midnightntwrk`).
