# Proof of Healing — Pitch Deck

Untuk Midnight Buildathon. Satu heading `##` = satu slide. Angka di sini hanya boleh diklaim
sebagaimana adanya: yang sudah diverifikasi ditandai jelas, yang belum juga.

## 1 · Judul

**Proof of Healing** — buktikan konsistensi pemulihan Anda tanpa pernah membuka isi hatinya.

Habit & mental health tracker di Midnight Network. Data di perangkat, bukti di rantai.
Repo: https://github.com/IdcuqS07/Proof-of-Healing · Lisensi Apache-2.0

## 2 · Masalah

- Jurnal kesehatan mental adalah data paling sensitif yang dimiliki seseorang; aplikasi habit
  tracker hari ini menyimpannya di server mereka.
- Akibatnya pengguna menyensor diri sendiri, dan komunitas dukungan menuntut identitas untuk
  membuktikan seseorang "serius".
- Sebaliknya, komunitas terbuka penuh bot dan akun sekali pakai — reputasi jadi tidak bermakna.

Dua kebutuhan yang tampak bertentangan: **privasi absolut** dan **bukti konsistensi yang
kredibel**.

## 3 · Solusi

Pisahkan data dari bukti:

| Tetap di perangkat | Masuk ke rantai |
| --- | --- |
| jurnal, mood, daftar kebiasaan | komitmen 32-byte, timestamp, counter |
| kunci enkripsi & seed pengguna | status micro-bond, badge yang diklaim |

Zero-knowledge circuit membuktikan "saya menjaga streak 7 hari" tanpa memberi tahu siapa saya,
apa kebiasaan saya, atau apa isi jurnal saya.

## 4 · Cara kerjanya (alur pengguna)

1. **Connect wallet → Register & Stake** — micro-bond 1.00 tDUST dikunci sebagai bukti kemanusiaan.
2. **Catat harian** — kebiasaan, mood, jurnal; dienkripsi AES-256-GCM sebelum menyentuh IndexedDB.
3. **Submit Daily Proof** — Proof-of-Work di peramban (5 nol heks) + kontrak menolak entri
   berjarak < 18 jam.
4. **Klaim ZK Badge** (7/14/30 hari) — badge anonim terbit, micro-bond dikembalikan pada
   milestone pertama.
5. **Anonymous Peer Group** — pintu dibuka oleh badge, bukan oleh identitas.

## 5 · Kenapa Midnight

- **Shielded state**: komitmen dan badge hidup di ledger tanpa membocorkan witness.
- **Compact**: aturan anti-bot (cooldown, stake, threshold streak) menjadi bagian dari circuit,
  bukan validasi klien yang bisa dilewati.
- **Selective disclosure**: `disclose()` memaksa kami eksplisit tentang apa yang keluar dari
  witness — audit privasi jadi terbaca di kode.

## 6 · Arsitektur

```
Peramban                                  Midnight
┌───────────────────────────────┐         ┌────────────────────────┐
│ Next.js 14 (App Router)       │         │ ProofOfHealingNative   │
│ jurnal → AES-256-GCM → IndexedDB        │  registerAndStake      │
│ PBKDF2-SHA256 210k iterasi    │  bukti  │  verifyDailyHabit      │
│ PoW klien (5 nol heks)        │ ──────▶ │  verifyStreakMilestone │
│ DApp Connector API v4 (Lace)  │         │  provePeerGroupAccess  │
└───────────────────────────────┘         └────────────────────────┘
        │                                    ▲
        └── proof server 8.1.0 (docker) ──────┘
```

Empat circuit Compact, empat ledger map + dua counter, nol plaintext di jaringan.

## 7 · Anti-bot & anti-Sybil

- **Micro-bond**: 1.00 tDUST dikunci per identitas, dikembalikan hanya setelah milestone pertama —
  biaya nyata untuk membuat ribuan akun.
- **Cooldown 18 jam di dalam circuit**: `blockTime - lastTimestamp >= 64_800` — bot tidak bisa
  memampatkan waktu.
- **Proof-of-Work peramban**: memaksa biaya komputasi per submit.
- **Threshold streak**: badge hanya terbit kalau streak benar-benar memenuhi target.

## 8 · Status yang terverifikasi

- Kontrak **dikompilasi `compactc` 0.31.1** — 4 circuit, prover/verifier key, ZKIR.
- **48 test hijau**, termasuk `tests/compiled-contract.test.ts` yang menjalankan circuit hasil
  kompilasi lewat `@midnight-ntwrk/compact-runtime` (bukan sekadar mock).
- **Devnet lokal jalan**: `proof-server:8.1.0` sehat, `midnight-node:1.0.1` memproduksi blok,
  `indexer-standalone:4.3.5` mengikuti tinggi blok.
- CI mengompilasi kontrak + lint + typecheck + test + build pada setiap push.
- Uji end-to-end di peramban menemukan 3 bug akuntansi/privasi; ketiganya sudah diperbaiki.

## 9 · Yang belum & jujur soal itu

- **Transaksi on-chain nyata belum dieksekusi.** Paket headless wallet publik
  (`@midnight-ntwrk/wallet` 5.0.0) masih di generasi ledger 4.0.0, sedangkan kontrak hasil
  `compactc` 0.31.1 butuh stack `ledger-v8` 8.1.0 — jadi jalur resmi kami adalah wallet extension
  (DApp Connector API v4). Rincian: `docs/ADR-002-onchain-path.md`.
- Tanpa extension, setiap bukti ditandai `simulated: true` di UI dan di data — aplikasi tidak
  pernah mengaku telah menulis ke jaringan.
- Peer group direplikasi antar konteks peramban (BroadcastChannel) dengan verifikasi badge + rantai
  hash; transport jaringan (relay/WebRTC) tinggal mengimplementasikan `PeerGroupTransport`.

## 10 · Roadmap

| Wave | Isi |
| --- | --- |
| Sekarang | kontrak terkompilasi, dApp lengkap, devnet lokal, CI |
| Berikutnya | deploy + stake/refund on-chain via wallet extension di testnet |
| Lanjut | transport peer group lintas perangkat, ekspor bukti untuk terapis/asuransi |
| Jauh | badge lintas-aplikasi (reputasi tanpa identitas) |

## 11 · Penutup

Privasi bukan fitur tambahan di aplikasi kesehatan mental — ia prasyarat agar orang mau jujur.
Proof of Healing menunjukkan konsistensi bisa dibuktikan tanpa satu pun kata jurnal keluar dari
perangkat.
