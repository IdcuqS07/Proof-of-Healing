import { loadLedger, saveLedger } from "./db";
import { ProofOfHealingContract, emptyLedger, STAKE_AMOUNT } from "./contract/simulator";
import { toHex, sha256 } from "./crypto";
import { solveProofOfWork, verifyProofOfWork, type PowResult } from "./pow";
import { generateProof, type ZkProof } from "./zk";

export interface TxReceipt {
  txId: string;
  blockTime: number;
  proof: ZkProof;
  pow?: PowResult;
}

async function contract(): Promise<ProofOfHealingContract> {
  return new ProofOfHealingContract((await loadLedger()) ?? emptyLedger());
}

async function commit(instance: ProofOfHealingContract): Promise<void> {
  await saveLedger(instance.snapshot());
}

async function txId(payload: unknown): Promise<string> {
  return `0x${toHex(await sha256(JSON.stringify(payload) + Date.now())).slice(0, 48)}`;
}

function blockTime(): number {
  return Math.floor(Date.now() / 1000);
}

/** Step 1 of the user guide: anonymous registration + micro-bond. */
export async function registerAndStake(
  seedHex: string,
  stakeAmount: number = STAKE_AMOUNT,
  onPowProgress?: (attempts: number) => void,
): Promise<TxReceipt> {
  const commitment = await ProofOfHealingContract.commitmentOf(seedHex);
  const pow = await solveProofOfWork(`register:${commitment}`, undefined, onPowProgress);
  const proof = await generateProof(
    "registerAndStake",
    { commitment, stakeAmount, powDigest: pow.digest },
    { seedHex },
    pow,
  );

  const instance = await contract();
  await instance.registerAndStake(seedHex, stakeAmount);
  await commit(instance);

  return { txId: await txId(proof.proofId), blockTime: blockTime(), proof, pow };
}

/** Step 3: submit the daily proof, gated by client-side PoW and on-chain cooldown. */
export async function submitDailyProof(
  seedHex: string,
  dailyCommitmentHash: string,
  onPowProgress?: (attempts: number) => void,
): Promise<TxReceipt> {
  const challenge = `daily:${dailyCommitmentHash}`;
  const pow = await solveProofOfWork(challenge, undefined, onPowProgress);
  if (!(await verifyProofOfWork(challenge, pow))) {
    throw new Error("proof-of-work verification failed");
  }

  const commitment = await ProofOfHealingContract.commitmentOf(seedHex);
  const proof = await generateProof(
    "verifyDailyHabit",
    { commitment, powDigest: pow.digest },
    { seedHex, dailyCommitmentHash },
    pow,
  );

  const time = blockTime();
  const instance = await contract();
  await instance.verifyDailyHabit(seedHex, dailyCommitmentHash, time);
  await commit(instance);

  return { txId: await txId(proof.proofId), blockTime: time, proof, pow };
}

/** Step 4: prove `streak >= requiredDays`, mint the badge and refund the bond. */
export async function claimMilestone(
  seedHex: string,
  streakLength: number,
  requiredDays: number,
): Promise<TxReceipt> {
  const commitment = await ProofOfHealingContract.commitmentOf(seedHex);
  const proof = await generateProof(
    "verifyStreakMilestone",
    { commitment, requiredDays },
    { seedHex, streakLength },
  );

  const instance = await contract();
  await instance.verifyStreakMilestone(seedHex, streakLength, requiredDays);
  await commit(instance);

  return { txId: await txId(proof.proofId), blockTime: blockTime(), proof };
}

/** Step 5: ZK gate for the anonymous peer group. */
export async function provePeerGroupAccess(
  seedHex: string,
  requiredDays: number,
): Promise<boolean> {
  const instance = await contract();
  return instance.provePeerGroupAccess(seedHex, requiredDays);
}

export async function ledgerStats(): Promise<{
  totalRegistered: number;
  totalMilestonesVerified: number;
  lastProofAt: number | null;
  bondLocked: boolean;
  seedCommitment?: string;
}> {
  const snapshot = (await loadLedger()) ?? emptyLedger();
  const commitments = Object.keys(snapshot.userCommitments);
  const own = commitments[0];
  return {
    totalRegistered: snapshot.totalRegistered,
    totalMilestonesVerified: snapshot.totalMilestonesVerified,
    lastProofAt: own ? snapshot.userCommitments[own] : null,
    bondLocked: own ? (snapshot.stakedBond[own] ?? 0) >= STAKE_AMOUNT : false,
    seedCommitment: own,
  };
}
