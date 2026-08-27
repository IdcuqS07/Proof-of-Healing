export interface WalletState {
  address: string;
  balance: number;
  network: string;
  /** True when the browser exposes a real Midnight extension wallet. */
  native: boolean;
  /** Unshielded address for receiving tokens from faucet */
  unshieldedAddress?: string;
}

export interface MidnightWalletApi {
  name?: string;
  apiVersion?: string;
  connect?(networkId: string): Promise<ConnectedAPI>;
  isEnabled?(): Promise<boolean>;
  enable?(): Promise<ConnectedAPI>;
}

export interface ConnectedAPI {
  getConfiguration(): Promise<{ networkId: string; indexerUri: string; proverServerUri: string; substrateNodeUri: string }>;
  getShieldedBalances(): Promise<Record<string, bigint>>;
  getUnshieldedBalances(): Promise<Record<string, bigint>>;
  getDustBalance(): Promise<{ cap: bigint; balance: bigint }>;
  getShieldedAddresses(): Promise<{ shieldedAddress: string }>;
  getUnshieldedAddress(): Promise<{ unshieldedAddress: string }>;
  getDustAddress(): Promise<{ dustAddress: string }>;
}

const EXPECTED_NETWORK_ID = "preview";

declare global {
  interface Window {
    midnight?: { mnLace?: MidnightWalletApi } & Record<string, MidnightWalletApi | undefined>;
    lace?: unknown;
    cardano?: unknown;
  }
}

function detectInjectedWallet(): MidnightWalletApi | null {
  if (typeof window === "undefined") return null;
  
  try {
    // Only access window.midnight when explicitly requested to avoid triggering extension communication
    const midnight = (window as unknown as Record<string, unknown>).midnight as { mnLace?: MidnightWalletApi } & Record<string, MidnightWalletApi | undefined>;
    if (!midnight) return null;
    
    // Check for 1AM wallet (official Midnight wallet)
    if (midnight['1am']) {
      return midnight['1am'] as MidnightWalletApi;
    }
    
    // Check for Lace Midnight wallet (mnLace)
    if (midnight.mnLace) {
      return midnight.mnLace as MidnightWalletApi;
    }
    
    // Check for any other Midnight wallet
    const wallet = Object.values(midnight).find(Boolean) ?? null;
    if (wallet) {
      return wallet as MidnightWalletApi;
    }
    
    return null;
  } catch (error) {
    console.error("Error detecting wallet:", error);
    return null;
  }
}

/**
 * Connects to the Midnight Extension Wallet.
 */
export async function connectWallet(): Promise<WalletState> {
  const injected = detectInjectedWallet();
  if (!injected) {
    throw new Error("No Midnight wallet extension detected. Please install and enable 1AM wallet or Lace Midnight wallet extension.");
  }

  try {
    let connectedApi: ConnectedAPI;
    
    // Try connect() method (new Midnight API)
    if (injected.connect) {
      console.log("Using connect() method with networkId:", EXPECTED_NETWORK_ID);
      try {
        connectedApi = await injected.connect(EXPECTED_NETWORK_ID);
      } catch (connectError) {
        console.error("connect() method failed:", connectError);
        throw new Error(`Wallet connection failed: ${connectError instanceof Error ? connectError.message : String(connectError)}`);
      }
    } 
    // Fallback to enable() method (old Lace Midnight API)
    else if (injected.enable) {
      console.log("Using enable() method (legacy)");
      try {
        connectedApi = await injected.enable();
      } catch (enableError) {
        console.error("enable() method failed:", enableError);
        throw new Error(`Wallet enable failed: ${enableError instanceof Error ? enableError.message : String(enableError)}`);
      }
    } else {
      throw new Error("Wallet does not support connect() or enable() methods");
    }
    
    // Get configuration to verify network
    let config;
    try {
      config = await connectedApi.getConfiguration();
      console.log("Wallet configuration from API:", config);
    } catch (configError) {
      console.error("getConfiguration() failed:", configError);
      throw new Error(`Failed to get wallet configuration: ${configError instanceof Error ? configError.message : String(configError)}`);
    }
    
    // Get shielded address
    let addresses;
    try {
      addresses = await connectedApi.getShieldedAddresses();
      console.log("Wallet addresses from API:", addresses);
    } catch (addressError) {
      console.error("getShieldedAddresses() failed:", addressError);
      throw new Error(`Failed to get wallet address: ${addressError instanceof Error ? addressError.message : String(addressError)}`);
    }
    const address = addresses.shieldedAddress;
    
    // Get unshielded address for faucet
    let unshieldedAddress;
    try {
      const unshielded = await connectedApi.getUnshieldedAddress();
      unshieldedAddress = unshielded.unshieldedAddress;
      console.log("Unshielded address for faucet:", unshieldedAddress);
    } catch (unshieldedError) {
      console.error("getUnshieldedAddress() failed:", unshieldedError);
      // Continue without unshielded address - not critical for basic functionality
    }
    
    // Get dust balance (for transaction fees)
    let dustBalance;
    try {
      dustBalance = await connectedApi.getDustBalance();
      console.log("Real wallet balance from API:", dustBalance);
    } catch (balanceError) {
      console.error("getDustBalance() failed:", balanceError);
      throw new Error(`Failed to get wallet balance: ${balanceError instanceof Error ? balanceError.message : String(balanceError)}`);
    }
    const balance = Number(dustBalance.balance);
    console.log("Final balance to display:", balance, "from real wallet:", true);
    
    // Verify network matches expected
    if (config.networkId !== EXPECTED_NETWORK_ID) {
      throw new Error(
        `Network mismatch: Wallet is on "${config.networkId}" but app requires "${EXPECTED_NETWORK_ID}". Please configure wallet to use ${EXPECTED_NETWORK_ID} network.`
      );
    }
    
    return {
      address,
      balance,
      network: `Midnight ${config.networkId}`,
      native: true,
      unshieldedAddress,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle specific extension communication errors
    if (errorMessage.includes("Could not establish connection") || 
        errorMessage.includes("Receiving end does not exist") ||
        errorMessage.includes("Extension communication error")) {
      console.error("Extension communication error:", errorMessage);
      throw new Error("Wallet extension communication failed. Please: 1) Check if wallet is installed and enabled 2) Refresh the page 3) Restart browser 4) Check browser extension permissions");
    }
    
    // Handle network ID errors
    if (errorMessage.includes("Invalid network ID") || errorMessage.includes("Valid networks are") || errorMessage.includes("Network mismatch")) {
      console.error("Network ID error:", errorMessage);
      throw new Error(`Wallet network configuration error. Please ensure your wallet is configured for the ${EXPECTED_NETWORK_ID} network in wallet settings.`);
    }
    
    console.error("Wallet connection error:", errorMessage);
    throw new Error(`Wallet connection failed: ${errorMessage}`);
  }
}
