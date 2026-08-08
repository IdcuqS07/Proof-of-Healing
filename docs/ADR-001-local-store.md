# ADR-001 — Penyimpanan lokal: `idb` (IndexedDB) alih-alih RxDB

Status: diterima · Konteks: PRD §"Local Storage: IndexedDB (RxDB) + AES-256"

## Keputusan

Data lokal (akun, kebiasaan, entri harian, bukti, badge, snapshot ledger) disimpan di
IndexedDB melalui pustaka tipis [`idb`](https://github.com/jakearchibald/idb), bukan RxDB.

## Alasan

1. **Enkripsi tetap end-to-end di aplikasi.** Setiap dokumen disegel dengan AES-256-GCM
   (`src/lib/crypto.ts`: PBKDF2-SHA-256 210.000 iterasi, salt 16 byte, IV 12 byte) sebelum
   menyentuh IndexedDB. Plugin enkripsi RxDB tidak diperlukan dan tidak menambah jaminan
   apa pun di atas ini.
2. **Tidak ada kebutuhan replikasi.** Nilai jual utama RxDB adalah replikasi/sinkronisasi
   multi-perangkat. Proof of Healing sengaja tidak menyinkronkan data medis ke mana pun,
   sehingga fitur itu justru bertentangan dengan model privasinya.
3. **Ukuran bundle.** `idb` ±1,5 kB gzip; RxDB + RxJS ±200 kB. Untuk enam object store
   sederhana, biayanya tidak sebanding.
4. **Permukaan uji lebih kecil.** Seluruh akses penyimpanan berada di satu modul
   (`src/lib/db.ts`) sehingga mudah di-mock dan diuji.

## Konsekuensi

- Query reaktif harus disusun manual (state React di `src/state/app-provider.tsx`).
- Bila kelak dibutuhkan sinkronisasi antarperangkat (mis. cadangan terenkripsi), RxDB dapat
  dipertimbangkan kembali; batas perubahannya terbatas pada `src/lib/db.ts` karena seluruh
  aplikasi hanya memakai fungsi-fungsi di modul itu.
