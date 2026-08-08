# ADR-002 — Jalur transaksi on-chain: wallet extension, bukan headless wallet

Status: diterima · Konteks: PRD FR-1.1 (micro-bond) & FR-3.x (verifikasi on-chain)

## Masalah

Stake/refund tDUST harus benar-benar dikirim ke jaringan Midnight. Ada dua jalur:

1. **Headless wallet di skrip Node** (pola `create-mn-app` / contoh `bboard`): `@midnight-ntwrk/wallet`
   + `midnight-js-*` untuk `deployContract` dan `callTx`.
2. **Wallet extension di browser** (Lace) lewat `@midnight-ntwrk/dapp-connector-api`.

## Temuan versi (diverifikasi 2026-08-08 dari registry npm publik)

| Paket | Versi | Ledger yang dipakai |
| --- | --- | --- |
| `compactc` (dipakai untuk kontrak ini) | 0.31.1 | butuh `compact-runtime` **0.16.0** |
| `@midnight-ntwrk/midnight-js-*` | 4.1.1 | `ledger-v8` 8.1.0 (`compact-runtime` 0.16.0) |
| `@midnight-ntwrk/wallet` (headless) | **5.0.0 (terbaru)** | `zswap`/`ledger` **4.0.0** |
| `@midnight-ntwrk/dapp-connector-api` | 4.0.1 | selaras `ledger-v8` |
| `midnightntwrk/proof-server` (devnet lokal) | 8.1.0 | — |

Artinya: **headless wallet publik (5.0.0) satu generasi ledger di belakang** stack yang dibutuhkan
kontrak hasil `compactc` 0.31.1. Menurunkan versi compiler bukan pilihan karena hasil kompilasinya
tidak lagi cocok dengan proof server 8.1.0 pada devnet resmi.

## Keputusan

Jalur on-chain resmi aplikasi ini adalah **wallet extension**:

- `src/lib/wallet.ts` memakai DApp Connector API v4 (`window.midnight[*].connect(networkId)`,
  `getShieldedAddresses`, `getShieldedBalances`, `getConfiguration`) — bukan lagi API `enable()` lama.
- Konfigurasi indexer/node/proof server diambil dari wallet (`getConfiguration`), jadi aplikasi
  mengikuti jaringan yang dipilih pengguna.
- Proving transaksi didelegasikan ke wallet (`getProvingProvider`) atau ke proof server yang
  ditunjuk `NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER`; probe kesehatannya ada di
  `src/lib/midnight/proof-server.ts` dan gagal keras kalau server tidak sehat.
- Tanpa extension, aplikasi memakai wallet pengembangan lokal dan menandai setiap bukti
  `simulated: true` — tidak pernah mengaku sebagai transaksi jaringan.

## Konsekuensi

- Belum ada skrip `npm run deploy` yang bisa dijalankan tanpa browser; itu menunggu rilis publik
  headless wallet untuk `ledger-v8` (atau `@midnight-ntwrk/wallet-sdk` yang stabil untuk
  `WalletProvider` Midnight.js 4.x).
- Yang sudah bisa diverifikasi tanpa wallet: kompilasi `compactc`, eksekusi circuit hasil kompilasi
  lewat `compact-runtime` (`tests/compiled-contract.test.ts`), dan devnet lokal
  (`docker/midnight-devnet.yml`: proof server sehat, node memproduksi blok, indexer mengikuti).
