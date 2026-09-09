# Deploying `ProofOfHealingNative` to Midnight

Self-contained tooling (own `package.json`) that compiles the Compact contract and deploys it with the Midnight JS SDK.

## Prerequisites

- Node.js 20+ and Docker
- [Compact CLI](https://docs.midnight.network/relnotes/compact-tools) on `PATH` (`compact --version`)
- A Midnight proof server running locally:
  ```bash
  docker run -p 6300:6300 midnightntwrk/proof-server -- midnight-proof-server --network preprod
  ```
- A wallet seed (64 hex chars) funded with tNIGHT from the faucet of the target network:
  - preprod: https://faucet.preprod.midnight.network/
  - preview: https://faucet.preview.midnight.network/

## Run

```bash
cd scripts/deploy && npm install && cd ../..

export MIDNIGHT_NETWORK=preprod          # preprod | preview | undeployed (local docker devnet)
export MIDNIGHT_WALLET_SEED=<64 hex>     # never commit this
export MIDNIGHT_PROOF_SERVER=http://127.0.0.1:6300

npm run deploy:contract
```

If `MIDNIGHT_WALLET_SEED` is omitted the script generates a fresh seed, prints it once together with the
`mn_addr_...` address, and then waits until the address receives tNIGHT from the faucet before continuing.

The script:

1. compiles `contracts/src/ProofOfHealingNative.compact` with `compact compile +0.31.1` into `scripts/deploy/build`
2. derives Zswap / Night / Dust keys from the seed (account 0, index 0) and syncs the wallet with the indexer
3. registers NIGHT UTXOs for DUST generation if needed and waits for DUST (fees)
4. proves and submits the deploy transaction via `deployContract`
5. writes `contracts/deployment.json` (`network`, `contractAddress`, `txId`, `blockHeight`) and prints the
   `NEXT_PUBLIC_CONTRACT_ADDRESS` line to add to `.env.local`

## Overrides

| Variable                   | Default (per network)                                   |
| -------------------------- | ------------------------------------------------------- |
| `MIDNIGHT_INDEXER_URL`     | `https://indexer.<net>.midnight.network/api/v3/graphql` |
| `MIDNIGHT_INDEXER_WS_URL`  | `wss://indexer.<net>.midnight.network/api/v3/graphql/ws` |
| `MIDNIGHT_NODE_URL`        | `https://rpc.<net>.midnight.network`                    |
| `MIDNIGHT_PROOF_SERVER`    | `http://127.0.0.1:6300`                                 |

## Notes

- Initial wallet sync on public testnets walks the chain from genesis and can take several minutes; the deploy
  script runs Node with `--max-old-space-size=8192` for this reason.
- Witness values (`userSecretSeed`, `dailyCommitmentHash`, ...) are supplied from private state in
  `witnesses.ts`; deployment only needs an empty private state. Private state is persisted (encrypted) in
  `scripts/deploy/.private-state`.
- Toolchain pin: Compact compiler 0.31.1 → `@midnight-ntwrk/compact-runtime` 0.16.0 → Midnight JS 4.1.1 /
  ledger-v8 8.1.0. Bump them together.
