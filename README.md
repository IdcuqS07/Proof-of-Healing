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
| Penyimpanan lokal | IndexedDB (`idb`), AES-256-GCM + PBKDF2 (`src/lib/crypto.ts`) — alasan tidak memakai RxDB: [ADR-001](docs/ADR-001-local-store.md) |
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
server alih-alih membuat bukti lokal.

Compose file ini sudah diuji jalan (network `undeployed`) dengan tag yang dipin:
`proof-server:8.1.0` (`/health` → `{"status":"ok"}`), `midnight-node:1.0.1` (memproduksi blok
dengan `CFG_PRESET=dev`), dan `indexer-standalone:4.3.5` (GraphQL di
`http://localhost:8088/api/v4/graphql` mengikuti tinggi blok node).

### Mengompilasi smart contract

```bash
# 1. pasang Compact developer tools (sekali saja)
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
export PATH="$HOME/.compact/bin:$PATH"
compact update

# 2. kompilasi kontrak
npm run compact:build
```

Kontrak sudah terverifikasi dengan **compactc 0.31.1**: keempat circuit terkompilasi dan
menghasilkan prover/verifier key serta ZKIR di `contracts/build/`:

```
Compiling 4 circuits:
contracts/build/contract/index.{js,d.ts}
contracts/build/keys/{registerAndStake,verifyDailyHabit,verifyStreakMilestone,provePeerGroupAccess}.{prover,verifier}
contracts/build/zkir/*.{zkir,bzkir}
```

CI memasang Compact developer tools dan mengompilasi kontrak pada setiap push, lalu
`tests/compiled-contract.test.ts` mengeksekusi circuit hasil kompilasi lewat
`@midnight-ntwrk/compact-runtime` — bukan hanya cerminan TypeScript-nya di
`src/lib/contract/simulator.ts`.

### Wallet & transaksi on-chain

`src/lib/wallet.ts` memakai [DApp Connector API v4](https://docs.midnight.network)
(`window.midnight[*].connect(networkId)`) sehingga indexer, node, dan proof server diambil dari
wallet yang terhubung. Skrip deploy headless belum tersedia karena paket wallet publik masih
satu generasi ledger di belakang `compactc` 0.31.1 — detail matriks versi dan konsekuensinya:
[ADR-002](docs/ADR-002-onchain-path.md).

### Peer group anonim

Setiap pesan membawa badge penulis (`badgeDays` + `proofId`) dan tertaut hash ke pesan
sebelumnya; pembaca memverifikasi ulang rantai itu dan membuang pesan yang gagal gate atau
diubah (`verifiedMessages`). Replikasi memakai `BroadcastChannel` sehingga tidak ada server yang
menyimpan feed, dan transport lain (relay/WebRTC) cukup mengimplementasikan
`PeerGroupTransport`.

## Pengujian

```bash
npm test          # 48 test: circuit hasil compactc, assertion kontrak, cooldown 18 jam,
                  # PoW, enkripsi, streak, wallet connector, verifikasi feed peer group
npm run typecheck
npm run lint
```

Cakupan test:

- `tests/contract.test.ts` — micro-bond, penolakan Sybil, cooldown 18 jam (termasuk batas
  tepat 64.800 detik), streak di bawah threshold, klaim ganda, refund bond.
- `tests/privacy.test.ts` — round-trip AES-256-GCM, kegagalan dekripsi lintas seed,
  unlinkability hash komitmen, verifikasi PoW, perhitungan streak.
- `tests/compiled-contract.test.ts` — keempat circuit hasil `compactc` dijalankan lewat
  `compact-runtime`, termasuk penolakan cooldown dan streak kurang.
- `tests/wallet.test.ts` — DApp Connector API v4 dan fallback wallet pengembangan.
- `tests/peer-group.test.ts` — gate badge dan deteksi feed yang diubah.
- `tests/proof-server.test.ts` — probe kesehatan proof server.

## Alur pengguna (ringkas dari User Guide)

1. **Connect Wallet → Register & Stake Deposit** — micro-bond dikunci sebagai bukti kemanusiaan.
2. **Catat kebiasaan harian** di Dashboard — tersimpan terenkripsi di perangkat.
3. **Submit Daily Proof** — PoW di peramban, lalu kontrak memverifikasi jeda ≥ 18 jam.
4. **Generate ZK Proof** di halaman ZK Badge — badge anonim terbit, deposit dikembalikan.
5. **Anonymous Peer Group** — akses dibuka oleh ZK Badge, tanpa identitas apa pun; setiap pesan
   diverifikasi ulang terhadap badge penulis dan rantai hash feed.

Panduan lengkap: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md).

## Roadmap

- **Wave 1** — kontrak Compact (stake + cooldown), node lokal, wireframe UI. ✔
- **Wave 2** — integrasi SDK Midnight, PoW peramban, generator ZK proof streak. ✔ (prover
  nyata aktif saat proof server tersedia)
- **Wave 3** — penyempurnaan UI/UX, cakupan test, grup anonim dengan verifikasi badge + rantai
  hash tanpa server. ✔
- **Berikutnya** — deploy & stake/refund on-chain via wallet extension di testnet, transport peer
  group lintas perangkat ([ADR-002](docs/ADR-002-onchain-path.md)).

## Lisensi

Apache License 2.0 — lihat [`LICENSE`](LICENSE).
