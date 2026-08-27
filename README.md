# Proof of Healing — ZK Mental Health & Habit Tracker

Absolute privacy-based mental health and habit tracker on the **Midnight Network**.
Daily journals remain encrypted on user devices (dual-ledger, client-side), while the
network only receives **Zero-Knowledge Proof** that habit streaks actually occurred.

- Hackathon target: **Midnight Buildathon | AKINDO** (GitHub topic: `midnightntwrk`)
- License: **Apache License 2.0**

## What the blockchain sees (and what it doesn't)

| Visible on ledger | Never leaves device |
| --- | --- |
| `commitment = persistentHash(secretSeed)` | user secret seed |
| last daily proof block time | dates & journal contents, mood |
| micro-bond status (locked/refunded) | habit names & categories |
| milestone badges (7/14/30) + aggregate counter | any medical history or identity |

## Architecture

```
CLIENT (browser)                                 ON-CHAIN (Midnight)
[Journal & habits] → IndexedDB (AES-256-GCM)
        ↓ daily commitment hash
[Proof-of-Work 3–5 s] → [ZK prover]  ──proof──▶  ProofOfHealingNative.compact
                                                 · check micro-bond (stake)
                                                 · check 18-hour cooldown
                                                 · check streak ≥ target
                                                 · issue anonymous badge
```

| Layer | Implementation |
| --- | --- |
| Smart contract | `contracts/src/ProofOfHealingNative.compact` |
| Contract mirror for dApp & testing | `src/lib/contract/simulator.ts` |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind |
| Local storage | IndexedDB (`idb`), AES-256-GCM + PBKDF2 (`src/lib/crypto.ts`) |
| Client anti-bot | `src/lib/pow.ts` (SHA-256 PoW, difficulty 5 nibble) |
| Wallet | `src/lib/wallet.ts` — Midnight Extension Wallet, fallback local dev wallet |
| Prover | `src/lib/zk.ts` — Midnight proof server if available, otherwise local proof |

## Running the application

```bash
npm install
npm run dev          # http://localhost:3000
```

Without Midnight Extension Wallet, the app automatically uses local development wallet and
executes contracts through simulator, so entire flow (register → daily proof →
badge → peer group) can still be tested end-to-end.

### Connecting to local Midnight node & proof server

```bash
# Midnight local dev container (proof server + node + indexer)
docker compose -f docker/midnight-devnet.yml up -d
export NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER=http://localhost:6300
npm run dev
```

When `NEXT_PUBLIC_MIDNIGHT_PROOF_SERVER` is set, `src/lib/zk.ts` sends witness to proof
server instead of creating local proof. `docker/midnight-devnet.yml` content follows official
Midnight images; adjust image tag to match testnet release you're using.

### Compiling smart contract

```bash
# compactc from Midnight Compact developer tools
compactc contracts/src/ProofOfHealingNative.compact contracts/build
```

Note: `compactc` is not available in public CI environment, so contract is compiled
locally. All contract assertions are mirrored one-to-one in
`src/lib/contract/simulator.ts` and tested by test suite.

## Testing

```bash
npm test          # 24 tests: contract assertions, 18-hour cooldown, PoW, encryption, streak
npm run typecheck
npm run lint
```

Test coverage:

- `tests/contract.test.ts` — micro-bond, Sybil rejection, 18-hour cooldown (including exact
  64,800 second boundary), streak below threshold, double claim, bond refund.
- `tests/privacy.test.ts` — AES-256-GCM round-trip, cross-seed decryption failure,
  commitment hash unlinkability, PoW verification, streak calculation.

## User flow (summary from User Guide)

1. **Connect Wallet → Register & Stake Deposit** — micro-bond locked as proof of humanity.
2. **Track daily habits** in Dashboard — stored encrypted on device.
3. **Submit Daily Proof** — PoW in browser, then contract verifies gap ≥ 18 hours.
4. **Generate ZK Proof** on ZK Badge page — anonymous badge issued, deposit refunded.
5. **Anonymous Peer Group** — access opened by ZK Badge, without any identity.

Complete guide: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md).

## Roadmap

- **Wave 1** — Compact contract (stake + cooldown), local node, UI wireframe. ✔
- **Wave 2** — Midnight SDK integration, browser PoW, streak ZK proof generator. ✔ (real
  prover active when proof server available)
- **Wave 3** — UI/UX refinement, test coverage, demo video, decentralized anonymous group.

## License

Apache License 2.0 — see [`LICENSE`](LICENSE).
