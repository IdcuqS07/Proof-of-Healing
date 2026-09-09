import preview from "../../deployments/preview.json";

export interface DeployedContract {
  readonly network: string;
  readonly contractAddress: string;
  readonly txId: string;
  readonly blockHeight: number;
  readonly deployedAt: string;
}

const DEPLOYMENTS: Record<string, DeployedContract> = { preview };

export const MIDNIGHT_NETWORK = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK ?? "preview";

/**
 * Address of the deployed ProofOfHealingNative contract, or undefined when the
 * app runs against a network without a deployment (the simulator is used then).
 */
export const CONTRACT_ADDRESS: string | undefined =
  process.env.NEXT_PUBLIC_MIDNIGHT_CONTRACT_ADDRESS ??
  DEPLOYMENTS[MIDNIGHT_NETWORK]?.contractAddress;

export function deployment(network: string = MIDNIGHT_NETWORK): DeployedContract | undefined {
  return DEPLOYMENTS[network];
}
