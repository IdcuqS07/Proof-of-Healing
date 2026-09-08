import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  userSecretSeed(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  dailyCommitmentHash(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  blockTime(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  streakLength(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  requiredDays(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  registerAndStake(context: __compactRuntime.CircuitContext<PS>,
                   stakeAmount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  verifyDailyHabit(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  verifyStreakMilestone(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  provePeerGroupAccess(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
}

export type ProvableCircuits<PS> = {
  registerAndStake(context: __compactRuntime.CircuitContext<PS>,
                   stakeAmount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  verifyDailyHabit(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  verifyStreakMilestone(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  provePeerGroupAccess(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerAndStake(context: __compactRuntime.CircuitContext<PS>,
                   stakeAmount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  verifyDailyHabit(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  verifyStreakMilestone(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  provePeerGroupAccess(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
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
  initialState(context: __compactRuntime.ConstructorContext<PS>): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
