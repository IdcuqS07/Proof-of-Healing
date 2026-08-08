import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  registerAndStake(context: __compactRuntime.CircuitContext<PS>,
                   userSecretSeed_0: Uint8Array,
                   stakeAmount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyDailyHabit(context: __compactRuntime.CircuitContext<PS>,
                   userSecretSeed_0: Uint8Array,
                   dailyCommitmentHash_0: Uint8Array,
                   blockTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyStreakMilestone(context: __compactRuntime.CircuitContext<PS>,
                        userSecretSeed_0: Uint8Array,
                        streakLength_0: bigint,
                        requiredDays_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  provePeerGroupAccess(context: __compactRuntime.CircuitContext<PS>,
                       userSecretSeed_0: Uint8Array,
                       requiredDays_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  registerAndStake(context: __compactRuntime.CircuitContext<PS>,
                   userSecretSeed_0: Uint8Array,
                   stakeAmount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyDailyHabit(context: __compactRuntime.CircuitContext<PS>,
                   userSecretSeed_0: Uint8Array,
                   dailyCommitmentHash_0: Uint8Array,
                   blockTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyStreakMilestone(context: __compactRuntime.CircuitContext<PS>,
                        userSecretSeed_0: Uint8Array,
                        streakLength_0: bigint,
                        requiredDays_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  provePeerGroupAccess(context: __compactRuntime.CircuitContext<PS>,
                       userSecretSeed_0: Uint8Array,
                       requiredDays_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
  cooldownSeconds(): bigint;
  requiredStake(): bigint;
}

export type Circuits<PS> = {
  cooldownSeconds(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  requiredStake(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  registerAndStake(context: __compactRuntime.CircuitContext<PS>,
                   userSecretSeed_0: Uint8Array,
                   stakeAmount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyDailyHabit(context: __compactRuntime.CircuitContext<PS>,
                   userSecretSeed_0: Uint8Array,
                   dailyCommitmentHash_0: Uint8Array,
                   blockTime_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyStreakMilestone(context: __compactRuntime.CircuitContext<PS>,
                        userSecretSeed_0: Uint8Array,
                        streakLength_0: bigint,
                        requiredDays_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  provePeerGroupAccess(context: __compactRuntime.CircuitContext<PS>,
                       userSecretSeed_0: Uint8Array,
                       requiredDays_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
  userCommitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  stakedBond: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  dailyProofCount: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  claimedBadges: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  readonly totalMilestonesVerified: bigint;
  readonly totalRegistered: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
