import dotenv from "dotenv";

dotenv.config();

// Configuration interface
export interface Config {
  privateKey: string;
  rpcUrl: string;
  initialBalance: number;
  port: number;
  logLevel: string;
  providerAddress: string;
  maxRetries: number;
}

// Load and validate configuration
const config: Config = {
  privateKey: process.env.PRIVATE_KEY || "",
  rpcUrl: process.env.RPC_URL || "https://evmrpc-testnet.0g.ai",
  initialBalance: Number.parseFloat(process.env.INITIAL_BALANCE || "0.05"),
  port: Number.parseInt(process.env.PORT || "3000", 10),
  logLevel: process.env.LOG_LEVEL || "info",
  providerAddress:
    process.env.PROVIDER_ADDRESS ||
    "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3",
  maxRetries: Number.parseInt(process.env.MAX_RETRIES || "3", 10),
};

// Validate required configuration
if (!config.privateKey) {
  throw new Error("PRIVATE_KEY environment variable is required");
}

export { config };
