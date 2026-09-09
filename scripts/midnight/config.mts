/**
 * Endpoints for the Midnight networks the deploy script targets.
 * Network ID and endpoints stay together so they cannot drift apart.
 */
export type NetworkName = "preview" | "preprod" | "undeployed";

export interface NetworkConfig {
  readonly networkId: NetworkName;
  readonly node: string;
  readonly indexerHttpUrl: string;
  readonly indexerWsUrl: string;
}

const NETWORKS: Record<NetworkName, NetworkConfig> = {
  preview: {
    networkId: "preview",
    node: "https://rpc.preview.midnight.network",
    indexerHttpUrl: "https://indexer.preview.midnight.network/api/v4/graphql",
    indexerWsUrl: "wss://indexer.preview.midnight.network/api/v4/graphql/ws",
  },
  preprod: {
    networkId: "preprod",
    node: "https://rpc.preprod.midnight.network",
    indexerHttpUrl: "https://indexer.preprod.midnight.network/api/v4/graphql",
    indexerWsUrl: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
  },
  undeployed: {
    networkId: "undeployed",
    node: "http://localhost:9944",
    indexerHttpUrl: "http://localhost:8088/api/v4/graphql",
    indexerWsUrl: "ws://localhost:8088/api/v4/graphql/ws",
  },
};

export function networkConfig(name: string | undefined): NetworkConfig {
  const key = (name ?? "preview") as NetworkName;
  const config = NETWORKS[key];
  if (!config) {
    throw new Error(`Unknown network "${name}", expected one of ${Object.keys(NETWORKS).join(", ")}`);
  }
  return config;
}

export const proofServerUrl = (): string =>
  process.env.MIDNIGHT_PROOF_SERVER ?? "http://localhost:6300";

export const formatNight = (raw: bigint): string =>
  `${raw / 1_000_000n}.${(raw % 1_000_000n).toString().padStart(6, "0")}`;

export const formatDust = (raw: bigint): string =>
  `${raw / 1_000_000_000_000_000n}.${(raw % 1_000_000_000_000_000n).toString().padStart(15, "0")}`;
