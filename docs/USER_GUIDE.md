# 📖 User Guide: Proof of Healing

Welcome to **Proof of Healing**, an absolute privacy-based mental health and habit tracker.
The application uses Zero-Knowledge Proofs on the Midnight network so your progress can be
proven without any personal data uploaded to the internet.

## 🛠️ Requirements & initial preparation

- **Browser**: Google Chrome / Brave / Firefox latest version.
- **Lace Wallet** installed in browser from https://www.lace.io/. Lace is the official wallet from Input Output Global (IOG), the team behind Cardano and Midnight. If not available, app automatically
  uses local development wallet so entire flow can still be tested.
- **Testnet tokens (tDUST)** for security deposit and network fees, obtained free from
  Midnight Faucet.

## 🚀 Step by step

### Step 1 — Connect wallet & register anonymously

1. Open Proof of Healing dApp.
2. Click **Connect Wallet** in top right and allow connection.
3. Click **Register & Stake Deposit**.
   - Browser runs short Proof-of-Work, then contract locks **1 tDUST micro-bond**
     as proof you're a real human.
   - Only recorded on-chain is `commitment = hash(your secret seed)`.
   - Deposit is fully refunded after streak milestone is achieved.

### Step 2 — Track daily habits (client-side)

1. In **Dashboard**, add habits you want to track (e.g. *Meditation 15 minutes*,
   *Emotion Journal*, *Therapy Compliance*).
2. Each day, check completed habits, set mood, and write journal if desired.
3. Click **Save local note**.

> **Privacy guarantee**: all notes stored in your device's IndexedDB, encrypted
> AES-256-GCM with key derived from your local seed. No server, developer, or
> other party can read them.

### Step 3 — Submit daily activity proof

1. Click **Submit Daily Proof**.
2. Browser runs Proof-of-Work (± 3–5 seconds) to limit mass execution by scripts.
3. Compact contract verifies **minimum 18-hour gap** between entries; if too fast,
   transaction rejected with message *"interaction too fast (bot detected)"*.
4. Confirm transaction in your wallet. Only daily commitment hash is sent.

### Step 4 — Claim milestone & ZK Badge

1. After streak reaches target (7, 14, or 30 days), open **ZK Badge** page.
2. **Generate ZK Proof** button is active for qualifying milestones.
3. Contract verifies `streak ≥ target` without knowing dates, habit names, or your
   journal contents.
4. Anonymous badge is issued and **micro-bond is refunded** to your wallet.

### Step 5 — Join Anonymous Peer Group

1. Open **Peer Group** page. Access opened by ZK Badge minimum 7 days.
2. You appear with alias derived from ZK commitment (e.g. `healer-3f8c`) — without name, photo, or
   social identity.

## ❓ FAQ

**Can my journal be seen publicly on blockchain?**
No. Journal encrypted on your device; only mathematical proof (true/false) is sent.

**Why must I lock security tokens?**
Micro-bonding is Compact contract's native anti-Sybil mechanism. Tokens refunded when
milestone achieved.

**What if I forget to log some days?**
Streak count adjusts and you can start new streak anytime; local historical data
not lost.

**Do I lose data if I change device or clear browser?**
Yes. Data only exists on your device — that's the price of absolute privacy. Encrypted
backup enters Wave 3 roadmap.

## 🛠️ Issues & help

- Ensure Midnight wallet connected to **Testnet**.
- Ensure sufficient tDUST balance for gas and deposit.
- If **Submit Daily Proof** button inactive, check remaining 18-hour cooldown time
  displayed in Dashboard.
- Report issues as GitHub repository issue (topic `midnightntwrk`).
