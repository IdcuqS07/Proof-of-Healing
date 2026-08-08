# Skrip Demo Video — Proof of Healing (target 3 menit)

## Persiapan (sebelum merekam)

```bash
npm install
npm run compact:build          # tampilkan output "Compiling 4 circuits"
docker compose -f docker/midnight-devnet.yml up -d
curl http://localhost:6300/health
npm run dev                    # http://localhost:3000
```

- Kosongkan state lama: buka aplikasi → Dashboard → **Hapus semua data lokal**.
- Siapkan dua tab peramban di `/group` untuk demo replikasi peer group.
- Zoom peramban 110 %, tutup notifikasi, gunakan mode gelap (default aplikasi).
- Rekam 1080p, tanpa suara sistem; narasi direkam terpisah atau live.

## 0:00–0:20 · Masalah

**Layar:** landing page aplikasi.

> "Jurnal kesehatan mental adalah data paling sensitif yang kita punya. Aplikasi habit tracker
> hari ini menyimpannya di server mereka — jadi orang menyensor dirinya sendiri. Proof of Healing
> membalik itu: data tetap di perangkat, hanya buktinya yang ke rantai."

## 0:20–0:45 · Register & micro-bond

**Aksi:** klik **Connect Wallet** → **Register & Stake Deposit**.

> "Wallet Midnight terhubung lewat DApp Connector API. Registrasi mengunci micro-bond 1 tDUST —
> biaya nyata untuk setiap identitas, sehingga membuat seribu bot jadi mahal. Yang masuk ke ledger
> hanya komitmen 32-byte, bukan siapa pun saya."

**Sorot:** kartu status yang menampilkan komitmen + bond terkunci.

## 0:45–1:20 · Catat harian & bukti tanpa data

**Aksi:** Dashboard → centang 2 kebiasaan, set mood, tulis jurnal → **Simpan**.
Buka DevTools → tab **Network**, tunjukkan tidak ada request saat menyimpan; lalu
**Application → IndexedDB** untuk menunjukkan isinya ciphertext.

> "Jurnal dienkripsi AES-256-GCM dengan kunci turunan PBKDF2 210 ribu iterasi, lalu masuk
> IndexedDB. Perhatikan tab Network: nol request. Isi IndexedDB pun hanya ciphertext."

**Aksi:** klik **Submit Daily Proof**, tunjukkan progres Proof-of-Work.

> "Proof-of-Work di peramban plus cooldown 18 jam yang dipaksakan di dalam circuit — bukan di
> klien. Bot tidak bisa memampatkan waktu."

## 1:20–1:40 · Cooldown ditolak

**Aksi:** klik **Submit Daily Proof** lagi segera.

> "Submit kedua ditolak dengan pesan dari kontrak: interaksi terlalu cepat. Aturan itu hidup di
> circuit Compact, jadi tidak bisa dilewati dari sisi klien."

## 1:40–2:10 · ZK Badge & refund

**Aksi:** halaman **ZK Badge** → **Generate ZK Proof** untuk milestone 7 hari.

> "Circuit `verifyStreakMilestone` membuktikan streak saya memenuhi target tanpa memberi tahu
> tanggal, kebiasaan, atau isi jurnal. Badge terbit anonim, dan micro-bond dikembalikan pada
> milestone pertama — sekali saja, tidak dobel."

**Sorot:** saldo wallet naik kembali dan badge muncul.

## 2:10–2:35 · Peer group ber-gate ZK

**Aksi:** halaman **Peer Group** → kirim satu pesan → pindah ke tab kedua, tunjukkan pesan muncul.

> "Pintu grup dibuka oleh badge, bukan identitas. Setiap pesan membawa badge penulis dan tertaut
> hash ke pesan sebelumnya; pembaca memverifikasi ulang dan membuang pesan yang diubah atau tanpa
> badge. Feed direplikasi antar konteks peramban — tidak ada server yang menyimpannya."

## 2:35–2:55 · Bukti teknis

**Aksi:** terminal — `npm run compact:build` (output "Compiling 4 circuits"), lalu `npm test`
(48 test hijau), lalu `docker ps` + `curl http://localhost:6300/health`.

> "Kontrak dikompilasi compactc 0.31.1, dan test suite mengeksekusi circuit hasil kompilasi lewat
> compact-runtime. Devnet Midnight lokal jalan: proof server sehat, node memproduksi blok, indexer
> mengikuti."

## 2:55–3:00 · Penutup

**Layar:** halaman repo GitHub.

> "Kode terbuka Apache-2.0. Batasannya kami tulis apa adanya: transaksi on-chain menunggu wallet
> extension karena paket wallet headless publik masih satu generasi ledger di belakang — semuanya
> ada di ADR-002. Proof of Healing: buktikan konsistensi, bukan isi hati Anda."

## Yang tidak boleh diklaim di video

- Jangan menyebut transaksi sudah masuk testnet sebelum benar-benar dieksekusi lewat wallet.
- Saat wallet extension tidak terpasang, UI menandai bukti `simulated` — jangan potong bagian itu.
