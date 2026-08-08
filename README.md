# Proof of Healing — ZK Mental Health & Habit Tracker

Pelacak kesehatan mental dan kebiasaan berbasis privasi mutlak di atas **Midnight Network**.
Jurnal harian tetap terenkripsi di perangkat pengguna (dual-ledger, sisi klien), sementara
jaringan hanya menerima **Zero-Knowledge Proof** bahwa streak kebiasaan benar terjadi.

- Target hackathon: **Midnight Buildathon | AKINDO** (topic GitHub: `midnightntwrk`)
- Lisensi: **Apache License 2.0**

## Apa yang dilihat blockchain (dan apa yang tidak)

| Terlihat di ledger | Tidak pernah meninggalkan perangkat |
| --- | --- |
| `commitment = persistentHash(secretSeed)` | seed rahasia pengguna |
| block time bukti harian terakhir | tanggal & isi jurnal, mood |
| status micro-bond (terkunci/dikembalikan) | nama & kategori kebiasaan |
| badge milestone (7/14/30) + counter agregat | riwayat medis atau identitas apa pun |

## Arsitektur

```
CLIENT (browser)                                 ON-CHAIN (Midnight)
[Jurnal & habit] → IndexedDB (AES-256-GCM)
        ↓ hash komitmen harian
[Proof-of-Work 3–5 s] → [ZK prover]  ──proof──▶  ProofOfHealingNative.compact
                                                 · cek micro-bond (stake)
                                                 · cek cooldown 18 jam
                                                 · cek streak ≥ target
                                                 · terbitkan badge anonim
```

| Layer | Implementasi |
| --- | --- |
| Smart contract | `contracts/src/ProofOfHealingNative.compact` |
| Mirror kontrak untuk dApp & test | `src/lib/contract/simulator.ts` |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind |
| Penyimpanan lokal | IndexedDB (`idb`), AES-256-GCM + PBKDF2 (`src/lib/crypto.ts`) |
| Anti-bot klien | `src/lib/pow.ts` (SHA-256 PoW, difficulty 5 nibble) |
| Wallet | `src/lib/wallet.ts` — Midnight Extension Wallet, fallback wallet dev lokal |
| Prover | `src/lib/zk.ts` — proof server Midnight bila tersedia, jika tidak proof lokal |

## Menjalankan aplikasi

```bash
npm install
npm run dev          # http://localhost:3000
```

Tanpa Midnight Extension Wallet, aplikasi otomatis memakai wallet pengembangan lokal dan
mengeksekusi kontrak melalui simulator, sehingga seluruh alur (register → bukti harian →
badge → peer group) tetap dapat dicoba end-to-end.

### Menghubungkan ke node & proof server Midnight lokal

```bash
# Midnight local dev container (proof server + node + indexer)
docker compose -f docker/midnight-devnet.yml up -d
export NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER=http://localhost:6300
npm run dev
```

Ketika `NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER` diset, `src/lib/zk.ts` mengirim witness ke proof
server alih-alih membuat bukti lokal. Isi `docker/midnight-devnet.yml` mengikuti image resmi
Midnight; sesuaikan tag image dengan rilis testnet yang Anda pakai.

### Mengompilasi smart contract

```bash
# compactc dari Midnight Compact developer tools
compactc contracts/src/ProofOfHealingNative.compact contracts/build
```

Catatan: `compactc` tidak tersedia di lingkungan CI publik, sehingga kontrak dikompilasi
secara lokal. Semua assertion kontrak dicerminkan satu-per-satu di
`src/lib/contract/simulator.ts` dan diuji oleh test suite.

## Pengujian

```bash
npm test          # 24 test: assertion kontrak, cooldown 18 jam, PoW, enkripsi, streak
npm run typecheck
npm run lint
```

Cakupan test:

- `tests/contract.test.ts` — micro-bond, penolakan Sybil, cooldown 18 jam (termasuk batas
  tepat 64.800 detik), streak di bawah threshold, klaim ganda, refund bond.
- `tests/privacy.test.ts` — round-trip AES-256-GCM, kegagalan dekripsi lintas seed,
  unlinkability hash komitmen, verifikasi PoW, perhitungan streak.

## Alur pengguna (ringkas dari User Guide)

1. **Connect Wallet → Register & Stake Deposit** — micro-bond dikunci sebagai bukti kemanusiaan.
2. **Catat kebiasaan harian** di Dashboard — tersimpan terenkripsi di perangkat.
3. **Submit Daily Proof** — PoW di peramban, lalu kontrak memverifikasi jeda ≥ 18 jam.
4. **Generate ZK Proof** di halaman ZK Badge — badge anonim terbit, deposit dikembalikan.
5. **Anonymous Peer Group** — akses dibuka oleh ZK Badge, tanpa identitas apa pun.

Panduan lengkap: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md).

## Roadmap

- **Wave 1** — kontrak Compact (stake + cooldown), node lokal, wireframe UI. ✔
- **Wave 2** — integrasi SDK Midnight, PoW peramban, generator ZK proof streak. ✔ (prover
  nyata aktif saat proof server tersedia)
- **Wave 3** — penyempurnaan UI/UX, cakupan test, video demo, grup anonim terdesentralisasi.

## Lisensi

Apache License 2.0 — lihat [`LICENSE`](LICENSE).
